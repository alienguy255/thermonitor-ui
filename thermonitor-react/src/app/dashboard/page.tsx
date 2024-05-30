'use client';

import styles from "./dashboard.module.css";
import { Fragment } from 'react';
import { gql, useQuery } from '@apollo/client';
import ThermostatChart from '@/components/ThermostatChart';
import { Location } from "@/types/location";
import { Thermostat } from "@/types/thermostat";
import { WeatherSample } from "@/types/samples";
import { StompSessionProvider } from "react-stomp-hooks";

const fromTime = new Date();
fromTime.setDate(fromTime.getDate() - 3);
const toTime = new Date(Date.now() - 1000 * 60); // one minute ago

export default function Dashboard() {

  const QUERY = gql`query locationDetails($fromTimeMs: String, $toTimeMs: String) {
                      locations {
                        id
                        description
                        weatherSamples(fromTimeMs: $fromTimeMs, toTimeMs: $toTimeMs) {
                          currentTemp
                          timeMs
                        }
                        thermostats {
                          id
                          name
                          samples(fromTimeMs: $fromTimeMs, toTimeMs: $toTimeMs) {
                            currentTemp
                            override
                            targetTemp
                            tstate
                            timeMs
                          }
                        }
                      }
                    }`;

  const { loading, error, data } = useQuery(
    QUERY,
    {
      variables: { fromTimeMs: fromTime.getTime(), toTimeMs: toTime.getTime() },
      fetchPolicy: 'cache-first',
    }
  );

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
      <main className={styles.main}>
        <div>Test Dashboard!</div>
        <div>
          {data.locations.map((location: Location) => (
            <Fragment key={location.id}>
              <h2 key={'h2-' + location.id}>Past 72 hours at {location.description}</h2>
              <ThermostatGroup key={location.id} thermostats={location.thermostats} weatherSamples={location.weatherSamples} />
            </Fragment>
          ))}
        </div>
      </main>
  );

}

function ThermostatGroup({
  thermostats,
  weatherSamples
}: {
  thermostats: Thermostat[];
  weatherSamples: WeatherSample[];
}) {

  return (
      <div>
      {thermostats.map((tstat: Thermostat) => (
        <StompSessionProvider key={'stomp-session-' + tstat.id} url="http://localhost:8081/websocket" connectHeaders={{}}>
          <ThermostatChart key={'thermostat-chart-' + tstat.id} thermostat={tstat} weatherSamples={weatherSamples} />
        </StompSessionProvider>
      ))}
      </div>
  );
}
