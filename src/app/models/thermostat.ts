export class Thermostat {

  id: string;

  location: Location;

  name: string;

  url: string;

  samples: ThermostatSample[];

}

export class Location {

  id: string;

  description: string;

  longitude: string;

  latitude: string;

  weatherSamples: WeatherSample[];

  thermostats: Thermostat[];

}

export class ThermostatSample {

    currentTemp: number;

    override: number;

    targetTemp: number;

    tstate: number;

    timeMs: number;

}

export class WeatherSample {

    currentTemp: number;

    timeMs: number;

}

export interface ThermostatUpdateEvent {

  thermostatId: string;

  sample: ThermostatSample;

}

export interface WeatherUpdateEvent {

  currentTemp: number;

  time: number;

}
