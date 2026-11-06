#include <Adafruit_NeoPixel.h>

#define DATA_PIN 2
#define LED_COUNT 500
uint8_t stripBrightness = 255;

Adafruit_NeoPixel strip(LED_COUNT, DATA_PIN, NEO_GRB + NEO_KHZ800);
uint32_t lastFrame = 0;

void setup() {
  strip.begin();
  strip.setBrightness(stripBrightness);
  strip.clear();
  strip.show();
}

void loop() {
  const uint32_t now = millis();
  if (now - lastFrame < 25) return;
  lastFrame = now;
  strip.setBrightness(stripBrightness);
  strip.clear();
  // Physical positions 1, 3, 5 ... 449 = zero-based indices 0, 2, 4 ... 448.
  const uint16_t activeCount = (LED_COUNT + 1) / 2;
  const uint16_t head = (now / 22) % activeCount;
  for (uint16_t pixel = 0; pixel < LED_COUNT; pixel += 2) {
    const uint16_t logical = pixel / 2;
    const uint16_t distance = (head + activeCount - logical) % activeCount;
    const uint16_t hue = (uint32_t)logical * 65536UL / activeCount + now * 9UL;
    // A moving rainbow, with a bright comet and a smoothly fading tail.
    const uint8_t level = distance < 35 ? 255 - distance * 6 : 28;
    strip.setPixelColor(pixel, strip.gamma32(strip.ColorHSV(hue, 235, level)));
  }
  strip.show();
}
