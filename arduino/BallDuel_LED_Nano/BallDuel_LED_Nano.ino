#include <Adafruit_NeoPixel.h>
#include <string.h>
#include <stdlib.h>

#define DATA_PIN 2
#define RINGS 5
// Each ring has 87 physical LEDs, driven as 29 groups of 3 (WS2811, 12 V).
#define LEDS_PER_RING 87
#define LEDS_PER_ADDRESS 3
#define CALIBRATION_LEDS_PER_HALF 42
#include "led-layout.h"
#define HIT_MS 700
#define ORBIT_MS 1200
uint8_t stripBrightness = 255;
// The same sketch goes to both boards; the PC selects the side by COM port.
#define DEVICE_ID F("BALL_DUEL_LED")
Adafruit_NeoPixel strip(PIXEL_COUNT, DATA_PIN, NEO_BRG + NEO_KHZ800);
char base[RINGS] = { 'X', 'X', 'X', 'X', 'X' };
char line[16];
uint8_t lineLength = 0;
bool overflow = false, pulseGreen = false, dirty = true;
uint8_t animatedMask = 0;
int8_t calibration = -1, calibrationHalf = -1;
uint32_t lastFrame = 0, lastInput = 0;
struct Feedback {
  uint32_t until;
  char color;
  bool orbit;
};
Feedback feedback[RINGS];

uint32_t rgb(char c) {
  if (c == 'B') return strip.Color(0, 80, 255);
  if (c == 'O') return strip.Color(255, 70, 0);
  if (c == 'G') return strip.Color(0, 255, 45);
  if (c == 'R') return strip.Color(255, 0, 0);
  if (c == 'Y') return strip.Color(255, 180, 0);
  if (c == 'W') return strip.Color(255, 255, 255);
  return 0;
}
bool validColor(char c) {
  return c == 'B' || c == 'O' || c == 'G' || c == 'R' || c == 'Y' || c == 'W' || c == 'X';
}
uint32_t dim(uint32_t color, uint8_t level) {
  return strip.Color((uint16_t)((color >> 16) & 255) * level / 255, (uint16_t)((color >> 8) & 255) * level / 255, (uint16_t)(color & 255) * level / 255);
}
void paintRing(uint8_t ring, char color, uint8_t level = 255) {
  uint32_t value = dim(rgb(color), level);
  uint16_t first = ringFirstPixel(ring);
  for (uint16_t i = 0; i < PIXELS_PER_RING; i++) strip.setPixelColor(first + i, value);
}
void paintOrbit(uint8_t ring, char color, uint32_t now) {
  const uint16_t head = (now % 1800) * PIXELS_PER_RING / 1800, opposite = (head + PIXELS_PER_RING / 2) % PIXELS_PER_RING;
  const uint8_t tail = (14 + LEDS_PER_ADDRESS - 1) / LEDS_PER_ADDRESS;
  const uint32_t value = rgb(color);
  const uint16_t first = ringFirstPixel(ring);
  for (uint16_t i = 0; i < PIXELS_PER_RING; i++) {
    uint16_t d1 = (head + PIXELS_PER_RING - i) % PIXELS_PER_RING, d2 = (opposite + PIXELS_PER_RING - i) % PIXELS_PER_RING;
    uint16_t distance = d1 < d2 ? d1 : d2;
    uint8_t level = distance < tail ? (uint32_t)(tail - distance) * (tail - distance) * 255 / (tail * tail) : 8;
    strip.setPixelColor(first + i, dim(value, level));
  }
}
void paintCalibration(uint32_t now) {
  strip.clear();
  const uint16_t begin = calibrationFirstPixel(calibration, calibrationHalf);
  const uint16_t end = calibrationEndPixel(calibration, calibrationHalf);
  const uint16_t phase = now % 1000;
  const uint8_t level = phase < 500 ? 80 + phase * 175UL / 500 : 80 + (1000 - phase) * 175UL / 500;
  for (uint16_t i = begin; i < end; i++) strip.setPixelColor(i, dim(rgb('W'), level));
}
void clearFeedback() {
  for (uint8_t r = 0; r < RINGS; r++) feedback[r].until = 0;
}
void setAll(char color) {
  for (uint8_t r = 0; r < RINGS; r++) base[r] = color;
  clearFeedback();
  dirty = true;
}
void render() {
  const uint32_t now = millis();
  bool animated = pulseGreen || calibration >= 0 || animatedMask;
  for (uint8_t r = 0; r < RINGS; r++)
    if (feedback[r].until) {
      if ((int32_t)(now - feedback[r].until) >= 0) {
        feedback[r].until = 0;
        dirty = true;
      } else if (feedback[r].orbit) animated = true;
    }
  if (!dirty && (!animated || now - lastFrame < 40)) return;
  if (lineLength || Serial.available() || now - lastInput < 3) return;
  lastFrame = now;
  dirty = false;
  if (calibration >= 0) paintCalibration(now);
  else
    for (uint8_t r = 0; r < RINGS; r++) {
      if (feedback[r].until) {
        if (feedback[r].orbit) paintOrbit(r, feedback[r].color, now);
        else paintRing(r, feedback[r].color);
      } else if (animatedMask & (1 << r)) paintOrbit(r, base[r], now);
      else paintRing(r, base[r]);
    }
  strip.setBrightness(stripBrightness);
  strip.show();
}
void command(const char* s) {
  if (!strcmp_P(s, PSTR("IDENTIFY")) || !strcmp_P(s, PSTR("HELLO"))) {
    Serial.print(DEVICE_ID);
    Serial.println(F(" READY"));
    return;
  }
  if (!strncmp_P(s, PSTR("IDLE "), 5) && strlen(s) == 6 && validColor(s[5])) {
    calibration = -1;
    calibrationHalf = -1;
    pulseGreen = false;
    animatedMask = 0;
    setAll(s[5]);
    Serial.println(F("ACK IDLE"));
    return;
  }
  if (!strncmp_P(s, PSTR("SET "), 4) && strlen(s) == 9) {
    for (uint8_t r = 0; r < RINGS; r++)
      if (!validColor(s[4 + r])) return;
    for (uint8_t r = 0; r < RINGS; r++) base[r] = s[4 + r];
    dirty = true;
    Serial.println(F("ACK SET"));
    return;
  }
  if (!strncmp_P(s, PSTR("ANIM "), 5) && strlen(s) >= 6 && strlen(s) <= 7) {
    const int mask = atoi(s + 5);
    if (mask >= 0 && mask <= 31) {
      animatedMask = mask;
      dirty = true;
      Serial.println(F("ACK ANIM"));
    }
    return;
  }
  // Kept for older control scripts; target animation is now selected with ANIM.
  if (!strcmp_P(s, PSTR("PULSE 0")) || !strcmp_P(s, PSTR("PULSE 1"))) {
    pulseGreen = s[6] == '1';
    dirty = true;
    Serial.println(F("ACK PULSE"));
    return;
  }
  if (!strcmp_P(s, PSTR("CAL 0"))) {
    calibration = -1;
    calibrationHalf = -1;
    dirty = true;
    Serial.println(F("ACK CAL 0"));
    return;
  }
  if (!strncmp_P(s, PSTR("CAL "), 4) && strlen(s) == 7 && s[4] >= '1' && s[4] <= '5' && s[5] == ' ' && s[6] >= '1' && s[6] <= '2') {
    calibration = s[4] - '1';
    calibrationHalf = s[6] - '1';
    clearFeedback();
    dirty = true;
    Serial.print(F("ACK CAL "));
    Serial.print(calibration + 1);
    Serial.print(' ');
    Serial.println(calibrationHalf + 1);
    return;
  }
  if (!strncmp_P(s, PSTR("HIT "), 4) && strlen(s) == 7 && s[4] >= '1' && s[4] <= '5' && s[5] == ' ' && (s[6] == 'G' || s[6] == 'R')) {
    feedback[s[4] - '1'] = { millis() + HIT_MS, s[6], false };
    dirty = true;
    Serial.println(F("ACK HIT"));
    return;
  }
  if (!strncmp_P(s, PSTR("CHASE "), 6) && strlen(s) == 7 && s[6] >= '1' && s[6] <= '5') {
    feedback[s[6] - '1'] = { millis() + ORBIT_MS, 'W', true };
    dirty = true;
    Serial.println(F("ACK CHASE"));
    return;
  }
  if (!strncmp_P(s, PSTR("FLASH "), 6) && strlen(s) == 11 && s[6] >= '1' && s[6] <= '5' && s[7] == ' ' && validColor(s[8]) && s[9] == ' ' && s[10] >= '1' && s[10] <= '5') {
    feedback[s[6] - '1'] = { millis() + (uint16_t)(s[10] - '0') * 350, s[8], false };
    dirty = true;
    Serial.println(F("ACK FLASH"));
    return;
  }
  if (!strcmp_P(s, PSTR("TEST"))) {
    calibration = -1;
    calibrationHalf = -1;
    pulseGreen = false;
    animatedMask = 31;
    clearFeedback();
    const char colors[] = { 'B', 'G', 'Y', 'R', 'O' };
    for (uint8_t r = 0; r < RINGS; r++) base[r] = colors[r];
    dirty = true;
    Serial.println(F("SELFTEST OK"));
  }
}
void setup() {
  Serial.begin(115200);
  strip.begin();
  strip.setBrightness(stripBrightness);
  strip.clear();
  strip.show();
  Serial.print(DEVICE_ID);
  Serial.println(F(" READY"));
}
void loop() {
  while (Serial.available()) {
    lastInput = millis();
    char c = Serial.read();
    if (c == '\n') {
      if (!overflow) {
        line[lineLength] = '\0';
        command(line);
      }
      lineLength = 0;
      overflow = false;
    } else if (c != '\r') {
      if (lineLength < sizeof(line) - 1) line[lineLength++] = c;
      else overflow = true;
    }
  }
  if ((lineLength || overflow) && millis() - lastInput > 200) {
    lineLength = 0;
    overflow = false;
  }
  render();
}
