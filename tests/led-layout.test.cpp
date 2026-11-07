#include "../arduino/BallDuel_LED_Nano/led-layout.h"

// Compiled using the configuration extracted from the actual .ino file.
static_assert(LEDS_PER_RING == 87, "One ring contains 87 physical LEDs");
static_assert(LEDS_PER_ADDRESS == 3, "One WS2811 address controls 3 physical LEDs");
static_assert(PIXELS_PER_RING == 29, "One ring requires 29 addresses");
static_assert(PIXEL_COUNT == 145, "Five rings require 145 addresses, not 435");
static_assert(CALIBRATION_PIXELS_PER_HALF == 14, "Only 14 addresses / 42 physical LEDs are lit");

constexpr bool validHalves(uint8_t ring){
  return calibrationFirstPixel(ring,0)>=ringFirstPixel(ring)
    && calibrationEndPixel(ring,0)<=calibrationFirstPixel(ring,1)
    && calibrationEndPixel(ring,1)<=ringFirstPixel(ring)+29
    && calibrationEndPixel(ring,0)-calibrationFirstPixel(ring,0)==14
    && calibrationEndPixel(ring,1)-calibrationFirstPixel(ring,1)==14;
}
static_assert(validHalves(0)&&validHalves(1)&&validHalves(2)&&validHalves(3)&&validHalves(4), "All ten segments stay inside their own ring");
static_assert(ringFirstPixel(0)==0&&ringFirstPixel(1)==29&&ringFirstPixel(2)==58&&ringFirstPixel(3)==87&&ringFirstPixel(4)==116, "Ring starts must use address counts");
static_assert(calibrationFirstPixel(0,0)==0&&calibrationEndPixel(0,0)==14, "First segment is addresses 0..13");
static_assert(calibrationFirstPixel(0,1)==15&&calibrationEndPixel(0,1)==29, "Second segment is addresses 15..28");
static_assert(calibrationFirstPixel(4,1)==131&&calibrationEndPixel(4,1)==145, "Last segment never crosses the 145-address strip boundary");
