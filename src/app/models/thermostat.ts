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

    currentTemp: string;

    override: string;

    targetTemp: string;

    tstate: string;

    timeMs: string;

}

export class WeatherSample {

    currentTemp: number;

    timeMs: number;

}

export interface ThermostatUpdateEvent {

  thermostatId: string;

  tstate: number;

  currentTemp: number;

  targetTemp: number;

  time: number;

}

export interface WeatherUpdateEvent {

  currentTemp: number;

  time: number;

}
