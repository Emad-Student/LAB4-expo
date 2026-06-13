import { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import * as Location from 'expo-location';

const weatherUrl = (lat, lon) =>
  `https://api.open-meteo.com/v1/forecast` +
  `?latitude=${lat}` +
  `&longitude=${lon}` +
  `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
  `&timezone=auto`;

const wikiUrl = (lat, lon) =>
  `https://pl.wikipedia.org/w/api.php` +
  `?action=query` +
  `&list=geosearch` +
  `&gscoord=${lat}|${lon}` +
  `&gsradius=10000` +
  `&gslimit=20` +
  `&format=json` +
  `&origin=*`;

export default function App() {
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');

  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');

  const [places, setPlaces] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState('');

  async function fetchWeather(lat, lon) {
    setWeatherLoading(true);
    setWeatherError('');
    setWeather(null);
    try {
      const res = await fetch(weatherUrl(lat, lon));
      if (!res.ok) throw new Error('Weather API error: ' + res.status);
      const data = await res.json();
      if (!data.current) throw new Error('Weather data missing in response.');
      setWeather(data.current);
    } catch (e) {
      setWeatherError(e.message);
    } finally {
      setWeatherLoading(false);
    }
  }

  async function fetchPlaces(lat, lon) {
    setPlacesLoading(true);
    setPlacesError('');
    setPlaces([]);
    try {
      const res = await fetch(wikiUrl(lat, lon));
      if (!res.ok) throw new Error('Wikipedia API error: ' + res.status);
      const data = await res.json();
      const results = data.query?.geosearch || [];
      setPlaces(results);
    } catch (e) {
      setPlacesError(e.message);
    } finally {
      setPlacesLoading(false);
    }
  }

  async function getLocation() {
    setLocationLoading(true);
    setLocationError('');
    setLocation(null);
    setWeather(null);
    setPlaces([]);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationError('Location permission was denied.');
        return;
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(current);

      const { latitude, longitude } = current.coords;
      fetchWeather(latitude, longitude);
      fetchPlaces(latitude, longitude);
    } catch (e) {
      setLocationError('Could not read device location.');
    } finally {
      setLocationLoading(false);
    }
  }

  const renderPlace = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardMeta}>
        {item.dist} m away · {Number(item.lat).toFixed(5)}, {Number(item.lon).toFixed(5)}
      </Text>
      <Text style={styles.cardMeta}>Page ID: {item.pageid}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>Location Explorer</Text>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={getLocation}
          disabled={locationLoading}
        >
          <Text style={styles.buttonText}>
            {locationLoading ? 'Getting location...' : 'Get My Location'}
          </Text>
        </Pressable>

        {locationLoading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Reading device location...</Text>
          </View>
        )}

        {locationError !== '' && (
          <Text style={styles.errorText}>{locationError}</Text>
        )}

        {/* Location section */}
        {location && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Location</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Latitude</Text>
              <Text style={styles.value}>{location.coords.latitude}</Text>
              <Text style={styles.label}>Longitude</Text>
              <Text style={styles.value}>{location.coords.longitude}</Text>
              <Text style={styles.label}>Accuracy</Text>
              <Text style={styles.value}>{location.coords.accuracy} m</Text>
              <Text style={styles.label}>Timestamp</Text>
              <Text style={styles.value}>
                {new Date(location.timestamp).toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {/* Weather section */}
        {location && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Weather</Text>
            {weatherLoading && (
              <View style={styles.centered}>
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={styles.loadingText}>Loading weather...</Text>
              </View>
            )}
            {weatherError !== '' && (
              <Text style={styles.errorText}>{weatherError}</Text>
            )}
            {weather && (
              <View style={styles.card}>
                <Text style={styles.label}>Temperature</Text>
                <Text style={styles.value}>{weather.temperature_2m} °C</Text>
                <Text style={styles.label}>Humidity</Text>
                <Text style={styles.value}>{weather.relative_humidity_2m} %</Text>
                <Text style={styles.label}>Wind Speed</Text>
                <Text style={styles.value}>{weather.wind_speed_10m} km/h</Text>
                <Text style={styles.label}>Weather Code</Text>
                <Text style={styles.value}>{weather.weather_code}</Text>
              </View>
            )}
          </View>
        )}

        {/* Nearby Wikipedia articles section */}
        {location && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nearby Wikipedia Articles</Text>
            {placesLoading && (
              <View style={styles.centered}>
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={styles.loadingText}>Loading nearby places...</Text>
              </View>
            )}
            {placesError !== '' && (
              <Text style={styles.errorText}>{placesError}</Text>
            )}
            {!placesLoading && !placesError && places.length === 0 && (
              <Text style={styles.emptyText}>No nearby articles found.</Text>
            )}
            {places.length > 0 && (
              <FlatList
                data={places}
                keyExtractor={(item) => item.pageid.toString()}
                renderItem={renderPlace}
                scrollEnabled={false}
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonPressed: {
    backgroundColor: '#1d4ed8',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  centered: {
    alignItems: 'center',
    marginVertical: 12,
  },
  loadingText: {
    marginTop: 6,
    color: '#6b7280',
    fontSize: 14,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    marginVertical: 8,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    marginTop: 8,
  },
  value: {
    fontSize: 15,
    color: '#111827',
    marginTop: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
});
