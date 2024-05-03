export class Thermostat {

  id: string;

  locationId: String;

  name: string;

  ipAddress: string;

}

export class Location {

  id: string;

  description: string;

  longitude: string;

  latitude: string;

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
