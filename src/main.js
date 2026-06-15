import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './styles.css';
import icon2xUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: icon2xUrl,
  iconUrl,
  shadowUrl,
});

const monitoringZones = [
  {
    query: 'Parque Nacional da Serra dos Órgãos, Brasil',
    label: 'Serra dos Órgãos',
    biome: 'Mata Atlântica',
    sensorHealth: 91,
  },
  {
    query: 'Parque Estadual da Cantareira, Brasil',
    label: 'Cantareira',
    biome: 'Mata Atlântica',
    sensorHealth: 84,
  },
  {
    query: 'Parque Estadual Intervales, Brasil',
    label: 'Intervales',
    biome: 'Mata Atlântica',
    sensorHealth: 88,
  },
  {
    query: 'Parque Nacional do Itatiaia, Brasil',
    label: 'Itatiaia',
    biome: 'Campos de altitude',
    sensorHealth: 79,
  },
  {
    query: 'Reserva Biológica do Tinguá, Brasil',
    label: 'Tinguá',
    biome: 'Mata Atlântica',
    sensorHealth: 86,
  },
  {
    query: 'Parque Nacional da Tijuca, Brasil',
    label: 'Tijuca',
    biome: 'Floresta urbana',
    sensorHealth: 95,
  },
  {
    query: 'Parque Estadual Carlos Botelho, Brasil',
    label: 'Carlos Botelho',
    biome: 'Mata Atlântica',
    sensorHealth: 82,
  },
  {
    query: 'Parque Estadual do Juquery, Brasil',
    label: 'Juquery',
    biome: 'Cerrado e campo',
    sensorHealth: 76,
  },
  {
    query: 'Parque Nacional do Pau Brasil, Brasil',
    label: 'Pau Brasil',
    biome: 'Mata Atlântica',
    sensorHealth: 83,
  },
  {
    query: 'Parque Estadual da Serra do Mar, Brasil',
    label: 'Serra do Mar',
    biome: 'Mata Atlântica',
    sensorHealth: 87,
  },
];

const app = document.querySelector('#app');

app.innerHTML = `
  <main class="shell">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Sprint 2 · Monitoramento remoto</p>
        <h1>Verde Radar</h1>
        <p class="lede">
          Dashboard para áreas de vegetação com pontos geográficos vindos do OpenStreetMap e
          condições meteorológicas atualizadas via Open-Meteo.
        </p>
        <div class="hero-metrics" id="hero-metrics"></div>
      </div>
      <div class="hero-panel">
        <div class="status-pill" id="status-pill">Carregando pontos e clima...</div>
        <div class="quick-note">
          Região de foco: corredores de vegetação da Mata Atlântica e áreas sensíveis a seca, vento e calor.
        </div>
      </div>
    </section>

    <section class="dashboard-grid">
      <article class="panel map-panel">
        <div class="panel-head">
          <div>
            <p class="panel-kicker">Mapa operacional</p>
            <h2>Pontos de monitoramento</h2>
          </div>
          <span class="panel-badge" id="points-count">0 pontos</span>
        </div>
        <div id="map" class="map"></div>
      </article>

      <aside class="panel stats-panel">
        <div class="panel-head compact">
          <div>
            <p class="panel-kicker">Resumo</p>
            <h2>Condição geral</h2>
          </div>
        </div>
        <div class="stats-grid" id="stats-grid"></div>
      </aside>
    </section>

    <section class="dashboard-grid lower-grid">
      <article class="panel list-panel">
        <div class="panel-head">
          <div>
            <p class="panel-kicker">Inventário</p>
            <h2>Lista de pontos geográficos</h2>
          </div>
        </div>
        <div class="point-list" id="point-list"></div>
      </article>

      <article class="panel forecast-panel">
        <div class="panel-head">
          <div>
            <p class="panel-kicker">Clima</p>
            <h2>Detalhe do ponto selecionado</h2>
          </div>
        </div>
        <div id="selected-details" class="selected-details">
          <div class="empty-state">Selecione um ponto para ver a leitura meteorológica completa.</div>
        </div>
      </article>
    </section>
  </main>
`;

const heroMetrics = document.querySelector('#hero-metrics');
const pointList = document.querySelector('#point-list');
const statsGrid = document.querySelector('#stats-grid');
const statusPill = document.querySelector('#status-pill');
const pointsCount = document.querySelector('#points-count');
const selectedDetails = document.querySelector('#selected-details');

const map = L.map('map', { scrollWheelZoom: false }).setView([-22.6, -43.2], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19,
}).addTo(map);

L.control.scale({ imperial: false }).addTo(map);

const weatherCodeMap = {
  0: { label: 'Céu limpo', tone: 'sun' },
  1: { label: 'Predominantemente limpo', tone: 'sun' },
  2: { label: 'Parcialmente nublado', tone: 'cloud' },
  3: { label: 'Nublado', tone: 'cloud' },
  45: { label: 'Neblina', tone: 'cloud' },
  48: { label: 'Neblina com gelo', tone: 'cloud' },
  51: { label: 'Garoa leve', tone: 'rain' },
  53: { label: 'Garoa moderada', tone: 'rain' },
  55: { label: 'Garoa intensa', tone: 'rain' },
  61: { label: 'Chuva fraca', tone: 'rain' },
  63: { label: 'Chuva moderada', tone: 'rain' },
  65: { label: 'Chuva forte', tone: 'rain' },
  66: { label: 'Chuva congelante fraca', tone: 'rain' },
  67: { label: 'Chuva congelante forte', tone: 'rain' },
  71: { label: 'Neve fraca', tone: 'snow' },
  73: { label: 'Neve moderada', tone: 'snow' },
  75: { label: 'Neve forte', tone: 'snow' },
  80: { label: 'Pancadas de chuva', tone: 'rain' },
  81: { label: 'Pancadas de chuva', tone: 'rain' },
  82: { label: 'Pancadas intensas', tone: 'rain' },
  95: { label: 'Tempestade', tone: 'storm' },
  96: { label: 'Tempestade com granizo', tone: 'storm' },
  99: { label: 'Tempestade severa', tone: 'storm' },
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const formatTemperature = (value) => `${Math.round(value)}°C`;
const formatSpeed = (value) => `${Math.round(value)} km/h`;
const formatHumidity = (value) => `${Math.round(value)}%`;

function buildFallbackPoint(zone) {
  const fallbackLocations = {
    'Parque Nacional da Serra dos Órgãos, Brasil': { latitude: -22.449, longitude: -43.007 },
    'Parque Estadual da Cantareira, Brasil': { latitude: -23.425, longitude: -46.616 },
    'Parque Estadual Intervales, Brasil': { latitude: -24.251, longitude: -48.423 },
    'Parque Nacional do Itatiaia, Brasil': { latitude: -22.454, longitude: -44.612 },
    'Reserva Biológica do Tinguá, Brasil': { latitude: -22.606, longitude: -43.431 },
    'Parque Nacional da Tijuca, Brasil': { latitude: -22.954, longitude: -43.276 },
    'Parque Estadual Carlos Botelho, Brasil': { latitude: -24.015, longitude: -48.097 },
    'Parque Estadual do Juquery, Brasil': { latitude: -23.401, longitude: -46.541 },
    'Parque Nacional do Pau Brasil, Brasil': { latitude: -16.466, longitude: -39.108 },
    'Parque Estadual da Serra do Mar, Brasil': { latitude: -23.894, longitude: -45.388 },
  };

  return {
    ...zone,
    latitude: fallbackLocations[zone.query].latitude,
    longitude: fallbackLocations[zone.query].longitude,
    source: 'fallback',
  };
}

async function geocodeZone(zone) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({
    q: zone.query,
    format: 'jsonv2',
    limit: '1',
    addressdetails: '0',
  }).toString();

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoding failed for ${zone.query}`);
    }

    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      throw new Error(`No result for ${zone.query}`);
    }

    const [match] = results;
    return {
      ...zone,
      latitude: Number(match.lat),
      longitude: Number(match.lon),
      displayName: match.display_name,
      source: 'openstreetmap',
    };
  } catch {
    return buildFallbackPoint(zone);
  }
}

async function fetchWeather(point) {
  const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
  weatherUrl.search = new URLSearchParams({
    latitude: point.latitude.toString(),
    longitude: point.longitude.toString(),
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
    hourly: 'temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation',
    daily: 'temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_sum',
    timezone: 'auto',
  }).toString();

  const response = await fetch(weatherUrl);
  if (!response.ok) {
    throw new Error(`Weather unavailable for ${point.label}`);
  }

  const payload = await response.json();
  const current = payload.current ?? {};
  const daily = payload.daily ?? {};
  const code = current.weather_code ?? 0;
  const codeInfo = weatherCodeMap[code] ?? { label: 'Condição indefinida', tone: 'cloud' };
  const temperature = Number(current.temperature_2m ?? 0);
  const humidity = Number(current.relative_humidity_2m ?? 0);
  const wind = Number(current.wind_speed_10m ?? 0);
  const precipitation = Number(daily.precipitation_sum?.[0] ?? 0);
  const uvIndex = Number(daily.uv_index_max?.[0] ?? 0);

  const riskScore = clamp(Math.round(100 - point.sensorHealth + temperature * 0.8 + wind * 1.4 - humidity * 0.25 + precipitation * 2), 0, 100);
  const vegetationStress = clamp(Math.round(24 + temperature * 1.2 + wind * 0.6 - humidity * 0.35 + precipitation * 1.5), 0, 100);
  const alertLevel = riskScore >= 75 ? 'Crítico' : riskScore >= 55 ? 'Atenção' : 'Estável';

  return {
    ...point,
    weather: {
      code,
      label: codeInfo.label,
      tone: codeInfo.tone,
      temperature,
      humidity,
      wind,
      precipitation,
      uvIndex,
      riskScore,
      vegetationStress,
      alertLevel,
      minTemperature: Number(daily.temperature_2m_min?.[0] ?? temperature),
      maxTemperature: Number(daily.temperature_2m_max?.[0] ?? temperature),
    },
    sensing: {
      canopyIndex: clamp(point.sensorHealth - vegetationStress * 0.3, 0, 100),
      moisture: clamp(80 - temperature * 0.7 + humidity * 0.3 - wind * 0.5, 0, 100),
      smokeRisk: clamp(riskScore + wind * 0.9 - humidity * 0.2, 0, 100),
    },
    hourly: {
      temperatureSeries: payload.hourly?.temperature_2m?.slice(0, 6) ?? [],
      windSeries: payload.hourly?.wind_speed_10m?.slice(0, 6) ?? [],
    },
  };
}

function createMetricCard(label, value, description) {
  return `
    <article class="metric-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${description}</small>
    </article>
  `;
}

function createPointCard(point, index) {
  const alertClass = point.weather.alertLevel.toLowerCase();
  return `
    <button class="point-card" data-index="${index}" type="button">
      <div class="point-card-top">
        <div>
          <p>${point.label}</p>
          <span>${point.biome}</span>
        </div>
        <strong class="alert-tag ${alertClass}">${point.weather.alertLevel}</strong>
      </div>
      <div class="point-card-body">
        <span>${point.latitude.toFixed(3)}, ${point.longitude.toFixed(3)}</span>
        <span>${point.weather.label}</span>
      </div>
    </button>
  `;
}

function createStatsHTML(points) {
  const avgTemp = points.reduce((sum, point) => sum + point.weather.temperature, 0) / points.length;
  const avgRisk = points.reduce((sum, point) => sum + point.weather.riskScore, 0) / points.length;
  const maxWind = Math.max(...points.map((point) => point.weather.wind));
  const criticalCount = points.filter((point) => point.weather.alertLevel === 'Crítico').length;

  return [
    ['Temperatura média', formatTemperature(avgTemp), 'Leituras atuais das áreas monitoradas'],
    ['Risco médio', `${Math.round(avgRisk)} / 100`, 'Estimativa composta de sensoriamento'],
    ['Vento máximo', formatSpeed(maxWind), 'Maior intensidade observada entre os pontos'],
    ['Alertas críticos', `${criticalCount} ponto(s)`, 'Locais que exigem atenção imediata'],
  ].map(([label, value, description]) => createMetricCard(label, value, description)).join('');
}

function createSelectedDetails(point) {
  const hours = point.hourly.temperatureSeries.slice(0, 4).map((value, index) => {
    const wind = point.hourly.windSeries[index] ?? point.weather.wind;
    return `
      <div class="hour-card">
        <strong>${index === 0 ? 'Agora' : `${index + 1}h`}</strong>
        <span>${formatTemperature(value)}</span>
        <small>Vento ${formatSpeed(wind)}</small>
      </div>
    `;
  }).join('');

  return `
    <div class="selected-card">
      <div class="selected-head">
        <div>
          <p>${point.label}</p>
          <h3>${point.biome}</h3>
        </div>
        <span class="alert-tag ${point.weather.alertLevel.toLowerCase()}">${point.weather.alertLevel}</span>
      </div>
      <div class="selected-grid">
        <div class="selected-stat">
          <span>Temperatura</span>
          <strong>${formatTemperature(point.weather.temperature)}</strong>
        </div>
        <div class="selected-stat">
          <span>Umidade</span>
          <strong>${formatHumidity(point.weather.humidity)}</strong>
        </div>
        <div class="selected-stat">
          <span>Vento</span>
          <strong>${formatSpeed(point.weather.wind)}</strong>
        </div>
        <div class="selected-stat">
          <span>UV máximo</span>
          <strong>${point.weather.uvIndex.toFixed(1)}</strong>
        </div>
      </div>
      <div class="selected-chips">
        <span>Chuva diária: ${point.weather.precipitation.toFixed(1)} mm</span>
        <span>Índice de estresse: ${point.weather.vegetationStress}</span>
        <span>Saúde do sensor: ${point.sensorHealth}%</span>
        <span>Coordenadas: ${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}</span>
      </div>
      <div class="hourly-strip">
        ${hours}
      </div>
    </div>
  `;
}

function setActivePoint(points, index, markers) {
  document.querySelectorAll('.point-card').forEach((card) => {
    card.classList.toggle('active', Number(card.dataset.index) === index);
  });

  const point = points[index];
  selectedDetails.innerHTML = createSelectedDetails(point);
  map.setView([point.latitude, point.longitude], 11, { animate: true });
  markers[index].openPopup();
}

async function bootstrap() {
  pointsCount.textContent = `${monitoringZones.length} pontos`;

  heroMetrics.innerHTML = `
    ${createMetricCard('Base geográfica', '10 pontos', 'OpenStreetMap/Nominatim')}
    ${createMetricCard('Clima integrado', 'Open-Meteo', 'Temperatura, vento, umidade e chuva')}
    ${createMetricCard('Contexto fictício', 'Sensores simulados', 'Índices de risco e estresse da vegetação')}
  `;

  const geocodedPoints = await Promise.all(monitoringZones.map(geocodeZone));

  statusPill.textContent = 'Carregando clima por ponto...';

  const monitoredPoints = await Promise.all(
    geocodedPoints.map(async (point) => {
      try {
        return await fetchWeather(point);
      } catch {
        return {
          ...point,
          weather: {
            code: 0,
            label: 'Dados meteorológicos indisponíveis',
            tone: 'cloud',
            temperature: 0,
            humidity: 0,
            wind: 0,
            precipitation: 0,
            uvIndex: 0,
            riskScore: 0,
            vegetationStress: 0,
            alertLevel: 'Estável',
            minTemperature: 0,
            maxTemperature: 0,
          },
          sensing: {
            canopyIndex: point.sensorHealth,
            moisture: 0,
            smokeRisk: 0,
          },
          hourly: {
            temperatureSeries: [0, 0, 0, 0],
            windSeries: [0, 0, 0, 0],
          },
        };
      }
    }),
  );

  const markers = monitoredPoints.map((enriched) => {
    const marker = L.marker([enriched.latitude, enriched.longitude]).addTo(map);
    marker.bindPopup(`
      <strong>${enriched.label}</strong><br/>
      ${enriched.weather.label}<br/>
      ${formatTemperature(enriched.weather.temperature)} · ${formatHumidity(enriched.weather.humidity)}
    `);
    return marker;
  });

  pointList.innerHTML = monitoredPoints.map((point, index) => createPointCard(point, index)).join('');
  statsGrid.innerHTML = createStatsHTML(monitoredPoints);
  statusPill.textContent = 'Monitoramento ativo';

  monitoredPoints.forEach((point, index) => {
    const card = pointList.querySelector(`[data-index="${index}"]`);
    card.addEventListener('click', () => setActivePoint(monitoredPoints, index, markers));
  });

  if (monitoredPoints.length > 0) {
    setActivePoint(monitoredPoints, 0, markers);
  }
}

bootstrap().catch((error) => {
  console.error(error);
  statusPill.textContent = 'Falha ao carregar dados';
  selectedDetails.innerHTML = `
    <div class="empty-state error">
      Não foi possível carregar os pontos e o clima. Verifique sua conexão e tente novamente.
    </div>
  `;
});
