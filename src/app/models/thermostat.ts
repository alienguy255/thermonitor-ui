export class Thermostat {

  id: string;

  location: Location;

  name: string;

  ipAddress: string;

}

export class Location {

  id: string;

  zipCode: string;

  city: string;

  state: string;

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
