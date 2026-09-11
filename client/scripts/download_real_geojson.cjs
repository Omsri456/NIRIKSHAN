const https = require('https');
const fs = require('fs');
const path = require('path');

const URLS = [
  'https://raw.githubusercontent.com/udit-001/india-maps-data/master/geojson/districts.geojson',
  'https://raw.githubusercontent.com/geohacker/india/master/district/india_district.geojson',
  'https://raw.githubusercontent.com/guneetnarula/indian-district-boundaries/master/india_districts.geojson',
  'https://raw.githubusercontent.com/datta07/INDIAN-SHAPEFILES/master/INDIA/INDIA_DISTRICTS.geojson',
  'https://raw.githubusercontent.com/Subhash9325/GeoJson-Data-of-Indian-States/master/Indian_States'
];

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    console.log(`Trying ${url}...`);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Status ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  let realGeoJson = null;
  for (const url of URLS) {
    try {
      const data = await downloadFile(url);
      if (data && data.features && data.features.length > 500) {
        console.log(`✅ Successfully downloaded real GeoJSON from ${url}: ${data.features.length} districts!`);
        realGeoJson = data;
        break;
      }
    } catch (e) {
      console.log(`❌ Failed ${url}: ${e.message}`);
    }
  }

  if (!realGeoJson) {
    console.error('Could not download real geojson from primary mirrors');
    process.exit(1);
  }

  console.log('Sample feature properties:', realGeoJson.features[0].properties);

  // Normalize properties to have standard district and state keys:
  const normalizedFeatures = realGeoJson.features.map((f, idx) => {
    const props = f.properties || {};
    // Extract district and state names from various standard shapefile property keys:
    const district =
      props.district ||
      props.District ||
      props.DISTRICT ||
      props.dtname ||
      props.NAME_2 ||
      props.name ||
      props.dt_name ||
      '';

    const state =
      props.state ||
      props.State ||
      props.STATE ||
      props.stname ||
      props.NAME_1 ||
      props.st_nm ||
      '';

    return {
      type: 'Feature',
      id: idx + 1,
      properties: {
        ...props,
        district: district.trim(),
        dtname: district.trim(),
        district_name: district.trim(),
        state: state.trim(),
        st_nm: state.trim(),
      },
      geometry: f.geometry,
    };
  });

  const cleanGeoJson = {
    type: 'FeatureCollection',
    features: normalizedFeatures,
  };

  const outFile = path.join(__dirname, '../public/geo/india_districts.json');
  fs.writeFileSync(outFile, JSON.stringify(cleanGeoJson), 'utf8');
  console.log(`✅ Saved ${normalizedFeatures.length} real geographic district boundaries to ${outFile}`);
}

run().catch(console.error);
