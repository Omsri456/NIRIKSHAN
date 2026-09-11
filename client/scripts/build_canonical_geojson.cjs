const fs = require('fs');
const path = require('path');
const https = require('https');

function fetchRawGeoJSON() {
  const cachePath = path.join(__dirname, 'raw_india_district.geojson');
  if (fs.existsSync(cachePath)) {
    return Promise.resolve(JSON.parse(fs.readFileSync(cachePath, 'utf8')));
  }
  return new Promise((resolve, reject) => {
    const url = 'https://raw.githubusercontent.com/geohacker/india/master/district/india_district.geojson';
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          fs.writeFileSync(cachePath, data);
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function clipPolygonByLatitude(coordinates, latThreshold, isLower) {
  return coordinates.map(ring => {
    const output = [];
    if (ring.length === 0) return output;
    for (let i = 0; i < ring.length; i++) {
      const curr = ring[i];
      const prev = ring[(i + ring.length - 1) % ring.length];
      const currInside = isLower ? curr[1] <= latThreshold : curr[1] >= latThreshold;
      const prevInside = isLower ? prev[1] <= latThreshold : prev[1] >= latThreshold;
      
      if (currInside) {
        if (!prevInside) {
          const t = (latThreshold - prev[1]) / (curr[1] - prev[1]);
          const interLng = prev[0] + t * (curr[0] - prev[0]);
          output.push([interLng, latThreshold]);
        }
        output.push(curr);
      } else if (prevInside) {
        const t = (latThreshold - prev[1]) / (curr[1] - prev[1]);
        const interLng = prev[0] + t * (curr[0] - prev[0]);
        output.push([interLng, latThreshold]);
      }
    }
    if (output.length > 0 && (output[0][0] !== output[output.length - 1][0] || output[0][1] !== output[output.length - 1][1])) {
      output.push([output[0][0], output[0][1]]);
    }
    return output;
  }).filter(ring => ring.length >= 4);
}

function computeCentroid(geometry) {
  let totalLat = 0, totalLng = 0, count = 0;
  function addRing(ring) {
    for (const [lng, lat] of ring) {
      totalLng += lng;
      totalLat += lat;
      count++;
    }
  }
  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach(addRing);
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach(poly => poly.forEach(addRing));
  }
  return count > 0 ? { latitude: +(totalLat / count).toFixed(4), longitude: +(totalLng / count).toFixed(4) } : { latitude: 20.5937, longitude: 78.9629 };
}

const STATE_NORM_MAP = {
  'andaman and nicobar': 'Andaman and Nicobar Islands',
  'andaman and nicobar islands': 'Andaman and Nicobar Islands',
  'andhra pradesh': 'Andhra Pradesh',
  'arunachal pradesh': 'Arunachal Pradesh',
  'assam': 'Assam',
  'bihar': 'Bihar',
  'chandigarh': 'Chandigarh',
  'chhattisgarh': 'Chhattisgarh',
  'dadra and nagar haveli': 'Dadra and Nagar Haveli and Daman and Diu',
  'daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
  'delhi': 'Delhi',
  'nct of delhi': 'Delhi',
  'goa': 'Goa',
  'gujarat': 'Gujarat',
  'haryana': 'Haryana',
  'himachal pradesh': 'Himachal Pradesh',
  'jammu and kashmir': 'Jammu and Kashmir',
  'jharkhand': 'Jharkhand',
  'karnataka': 'Karnataka',
  'kerala': 'Kerala',
  'ladakh': 'Ladakh',
  'lakshadweep': 'Lakshadweep',
  'madhya pradesh': 'Madhya Pradesh',
  'maharashtra': 'Maharashtra',
  'manipur': 'Manipur',
  'meghalaya': 'Meghalaya',
  'mizoram': 'Mizoram',
  'nagaland': 'Nagaland',
  'odisha': 'Odisha',
  'orissa': 'Odisha',
  'puducherry': 'Puducherry',
  'pondicherry': 'Puducherry',
  'punjab': 'Punjab',
  'rajasthan': 'Rajasthan',
  'sikkim': 'Sikkim',
  'tamil nadu': 'Tamil Nadu',
  'telangana': 'Telangana',
  'tripura': 'Tripura',
  'uttar pradesh': 'Uttar Pradesh',
  'uttarakhand': 'Uttarakhand',
  'uttaranchal': 'Uttarakhand',
  'west bengal': 'West Bengal'
};

const DISTRICT_NORM_MAP = {
  'maharashtra': {
    'ahilyanagar': 'Ahmednagar',
    'ahmednagar': 'Ahmednagar',
    'ahmadnagar': 'Ahmednagar',
    'chhatrapati sambhajinagar': 'Aurangabad',
    'aurangabad': 'Aurangabad',
    'sambhajinagar': 'Aurangabad',
    'dharashiv': 'Osmanabad',
    'osmanabad': 'Osmanabad',
    'bid': 'Beed',
    'beed': 'Beed',
    'buldana': 'Buldhana',
    'buldhana': 'Buldhana',
    'garhchiroli': 'Gadchiroli',
    'gadchiroli': 'Gadchiroli',
    'gondiya': 'Gondia',
    'gondia': 'Gondia',
    'raigarh': 'Raigad',
    'raigad': 'Raigad',
    'mumbai': 'Mumbai',
    'mumbai city': 'Mumbai',
    'greater bombay': 'Mumbai',
    'mumbai suburban': 'Mumbai Suburban',
    'mumbai suburban district': 'Mumbai Suburban',
    'thane': 'Thane',
    'palghar': 'Palghar',
  },
  'odisha': {
    'anugola': 'Angul',
    'angul': 'Angul',
    'baleshwar': 'Balasore',
    'balasore': 'Balasore',
    'baragarh': 'Bargarh',
    'bargarh': 'Bargarh',
    'baudh': 'Boudh',
    'boudh': 'Boudh',
    'debagada': 'Deogarh',
    'deogarh': 'Deogarh',
    'jagatsinghapur': 'Jagatsinghpur',
    'jagatsinghpur': 'Jagatsinghpur',
    'jajapur': 'Jajpur',
    'jajpur': 'Jajpur',
    'kandhamala': 'Kandhamal',
    'kandhamal': 'Kandhamal',
    'kendrapada': 'Kendrapara',
    'kendrapara': 'Kendrapara',
    'kendujhar': 'Keonjhar',
    'keonjhar': 'Keonjhar',
    'khordha': 'Khurda',
    'khurda': 'Khurda',
    'nabarangapur': 'Nabarangpur',
    'nabarangpur': 'Nabarangpur',
    'nayagada': 'Nayagarh',
    'nayagarh': 'Nayagarh',
    'subarnapur': 'Sonepur',
    'sonepur': 'Sonepur',
    'sundargarh': 'Sundargarh',
    'sundergarh': 'Sundargarh',
  }
};

async function main() {
  const rawGeo = await fetchRawGeoJSON();
  const outputFeatures = [];
  const processedKeys = new Set();

  rawGeo.features.forEach((feature) => {
    const rawState = (feature.properties.NAME_1 || feature.properties.state || '').trim();
    const rawDist = (feature.properties.NAME_2 || feature.properties.district || '').trim();
    const stateLower = rawState.toLowerCase();
    const canonicalState = STATE_NORM_MAP[stateLower] || rawState;
    const distLower = rawDist.toLowerCase();

    // Greater Bombay split
    if (canonicalState === 'Maharashtra' && distLower === 'greater bombay') {
      const rings = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
      const cityCoords = rings.map(p => clipPolygonByLatitude(p, 19.045, true)).filter(p => p.length > 0);
      const subCoords = rings.map(p => clipPolygonByLatitude(p, 19.045, false)).filter(p => p.length > 0);

      const cityGeom = { type: 'MultiPolygon', coordinates: cityCoords };
      const subGeom = { type: 'MultiPolygon', coordinates: subCoords };

      outputFeatures.push({
        type: 'Feature',
        properties: {
          ...feature.properties,
          state: 'Maharashtra',
          st_nm: 'Maharashtra',
          district: 'Mumbai',
          district_name: 'Mumbai',
          dtname: 'Mumbai',
          district_id: 'MH_MUMBAI_CITY',
          aliases: ['mumbai', 'mumbai city', 'greater bombay', 'south mumbai'],
          ...computeCentroid(cityGeom)
        },
        geometry: cityGeom
      });

      outputFeatures.push({
        type: 'Feature',
        properties: {
          ...feature.properties,
          state: 'Maharashtra',
          st_nm: 'Maharashtra',
          district: 'Mumbai Suburban',
          district_name: 'Mumbai Suburban',
          dtname: 'Mumbai Suburban',
          district_id: 'MH_MUMBAI_SUBURBAN',
          aliases: ['mumbai suburban', 'mumbai suburban district', 'suburban mumbai'],
          ...computeCentroid(subGeom)
        },
        geometry: subGeom
      });
      return;
    }

    // Thane split
    if (canonicalState === 'Maharashtra' && distLower === 'thane') {
      const rings = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
      const thaneCoords = rings.map(p => clipPolygonByLatitude(p, 19.35, true)).filter(p => p.length > 0);
      const palgharCoords = rings.map(p => clipPolygonByLatitude(p, 19.35, false)).filter(p => p.length > 0);

      const thaneGeom = { type: 'MultiPolygon', coordinates: thaneCoords };
      const palgharGeom = { type: 'MultiPolygon', coordinates: palgharCoords };

      outputFeatures.push({
        type: 'Feature',
        properties: {
          ...feature.properties,
          state: 'Maharashtra',
          st_nm: 'Maharashtra',
          district: 'Thane',
          district_name: 'Thane',
          dtname: 'Thane',
          district_id: 'MH_THANE',
          aliases: ['thane'],
          ...computeCentroid(thaneGeom)
        },
        geometry: thaneGeom
      });

      outputFeatures.push({
        type: 'Feature',
        properties: {
          ...feature.properties,
          state: 'Maharashtra',
          st_nm: 'Maharashtra',
          district: 'Palghar',
          district_name: 'Palghar',
          dtname: 'Palghar',
          district_id: 'MH_PALGHAR',
          aliases: ['palghar'],
          ...computeCentroid(palgharGeom)
        },
        geometry: palgharGeom
      });
      return;
    }

    let canonicalDist = rawDist;
    const stateNorms = DISTRICT_NORM_MAP[stateLower];
    if (stateNorms && stateNorms[distLower]) {
      canonicalDist = stateNorms[distLower];
    }

    const uniqueKey = `${canonicalState}:::${canonicalDist}`.toLowerCase();
    if (processedKeys.has(uniqueKey)) return;
    processedKeys.add(uniqueKey);

    const centroid = computeCentroid(feature.geometry);

    outputFeatures.push({
      type: 'Feature',
      properties: {
        ...feature.properties,
        state: canonicalState,
        st_nm: canonicalState,
        district: canonicalDist,
        district_name: canonicalDist,
        dtname: canonicalDist,
        district_id: `${canonicalState.toUpperCase().replace(/\s+/g, '_')}_${canonicalDist.toUpperCase().replace(/\s+/g, '_')}`,
        aliases: [rawDist.toLowerCase(), canonicalDist.toLowerCase()],
        ...centroid
      },
      geometry: feature.geometry
    });
  });

  const finalGeoJSON = {
    type: 'FeatureCollection',
    features: outputFeatures
  };

  const outputPath = path.join(__dirname, '../public/geo/india_districts.json');
  fs.writeFileSync(outputPath, JSON.stringify(finalGeoJSON));
  console.log(`✅ Successfully generated canonical GeoJSON with ${outputFeatures.length} features!`);
  const mhFeatures = outputFeatures.filter(f => f.properties.state === 'Maharashtra');
  console.log(`Maharashtra features: ${mhFeatures.length}`);
  mhFeatures.sort((a,b) => a.properties.district.localeCompare(b.properties.district)).forEach(f => {
    console.log(`- ${f.properties.district.padEnd(20)} ID: ${f.properties.district_id.padEnd(25)} Lat: ${f.properties.latitude.toFixed(4)}, Lng: ${f.properties.longitude.toFixed(4)}`);
  });
}

main().catch(console.error);
