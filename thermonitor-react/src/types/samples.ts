export interface ThermostatSample {
  currentTemp: number;
  override: number;
  targetTemp: number;
  tstate: number;
  timeMs: number;
}

export interface WeatherSample {
  currentTemp: number;
  timeMs: number;
}