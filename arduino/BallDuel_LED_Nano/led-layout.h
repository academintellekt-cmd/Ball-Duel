#pragma once
#include <stdint.h>

// Physical LEDs and WS2811 addresses are different units: one address drives 3 LEDs.
#define PIXELS_PER_RING (LEDS_PER_RING / LEDS_PER_ADDRESS)
#define PIXEL_COUNT (RINGS * PIXELS_PER_RING)
#define CALIBRATION_PIXELS_PER_HALF (CALIBRATION_LEDS_PER_HALF / LEDS_PER_ADDRESS)

static_assert(LEDS_PER_ADDRESS > 0, "Invalid LEDs per address");
static_assert(LEDS_PER_RING % LEDS_PER_ADDRESS == 0, "A ring must contain whole addressable groups");
static_assert(CALIBRATION_LEDS_PER_HALF % LEDS_PER_ADDRESS == 0, "Calibration must contain whole addressable groups");
static_assert(CALIBRATION_PIXELS_PER_HALF > 0 && CALIBRATION_PIXELS_PER_HALF <= PIXELS_PER_RING / 2, "Calibration segment must fit inside either half");

constexpr uint16_t ringFirstPixel(uint8_t ring){return (uint16_t)ring * PIXELS_PER_RING;}
constexpr uint16_t calibrationFirstPixel(uint8_t ring,uint8_t half){return ringFirstPixel(ring)+(half ? (PIXELS_PER_RING+1)/2 : 0);}
constexpr uint16_t calibrationEndPixel(uint8_t ring,uint8_t half){return calibrationFirstPixel(ring,half)+CALIBRATION_PIXELS_PER_HALF;}
