// @ts-nocheck
import {Proj4Projection} from '@math.gl/proj4';
import {transformGeoJsonCoords} from '@loaders.gl/gis';

import {deserialize as deserializeGeoJson} from 'flatgeobuf/lib/cjs/geojson';
import {deserialize as deserializeGeneric} from 'flatgeobuf/lib/cjs/generic';
import {parseProperties as parsePropertiesBinary} from 'flatgeobuf/lib/cjs/generic/feature';

import {fromGeometry as binaryFromGeometry} from './binary-geometries';
import {FlatGeobufLoaderOptions} from './types';
import {GeoJSONRowTable, Feature} from '@loaders.gl/schema';

// TODO: reproject binary features
function binaryFromFeature(feature, header) {
  const geometry = feature.geometry();

  // FlatGeobuf files can only hold a single geometry type per file, otherwise
  // GeometryType is GeometryCollection
  // I believe geometry.type() is null (0) except when the geometry type isn't
  // known in the header?
  const geometryType = header.geometryType || geometry.type();
  const parsedGeometry = binaryFromGeometry(geometry, geometryType);
  parsedGeometry.properties = parsePropertiesBinary(feature, header.columns);

  // TODO: wrap binary data either in points, lines, or polygons key
  return parsedGeometry;
}

/*
 * Parse FlatGeobuf arrayBuffer and return GeoJSON.
 *
 * @param arrayBuffer  A FlatGeobuf arrayBuffer
 * @return A GeoJSON geometry object
 */
export function parseFlatGeobuf(arrayBuffer: ArrayBuffer, options?: FlatGeobufLoaderOptions) {
  const shape = options?.gis?.format || options?.flatgeobuf?.shape;

  switch (shape) {
    case 'geojson-row-table': {
      const table: GeoJSONRowTable = {
        shape: 'geojson-row-table',
        data: parseFlatGeobufToGeoJSON(arrayBuffer, options)
      };
      return table;
    }
    case 'columnar-table': // binary + some JS arrays
      return {shape: 'columnar-table', data: parseFlatGeobufToBinary(arrayBuffer, options)};
    case 'geojson':
      return parseFlatGeobufToGeoJSON(arrayBuffer, options);
    case 'binary':
      return parseFlatGeobufToBinary(arrayBuffer, options);
    default:
      throw new Error(shape);
  }
}

function parseFlatGeobufToBinary(arrayBuffer: ArrayBuffer, options: FlatGeobufLoaderOptions) {
  // TODO: reproject binary features
  // const {reproject = false, _targetCrs = 'WGS84'} = (options && options.gis) || {};

  const array = new Uint8Array(arrayBuffer);
  return deserializeGeneric(array, binaryFromFeature);
}

function parseFlatGeobufToGeoJSON(
  arrayBuffer: ArrayBuffer,
  options: FlatGeobufLoaderOptions
): Feature[] {
  if (arrayBuffer.byteLength === 0) {
    return [];
  }

  const {reproject = false, _targetCrs = 'WGS84'} = (options && options.gis) || {};

  const arr = new Uint8Array(arrayBuffer);

  let headerMeta;
  const {features} = deserializeGeoJson(arr, false, (header) => {
    headerMeta = header;
  });

  const crs = headerMeta && headerMeta.crs;
  let projection;
  if (reproject && crs) {
    // Constructing the projection may fail for some invalid WKT strings
    try {
      projection = new Proj4Projection({from: crs.wkt, to: _targetCrs});
    } catch (e) {
      // no op
    }
  }

  if (projection) {
    return transformGeoJsonCoords(features, (coords) => projection.project(coords));
  }

  return features;
}

/*
 * Parse FlatGeobuf arrayBuffer and return GeoJSON.
 *
 * @param {ReadableStream} _ A FlatGeobuf arrayBuffer
 * @return  A GeoJSON geometry object iterator
 */
// eslint-disable-next-line complexity
export function parseFlatGeobufInBatches(stream, options: FlatGeobufLoaderOptions) {
  if (options && options.gis && options.gis.format === 'binary') {
    return parseFlatGeobufInBatchesToBinary(stream, options);
  }

  return parseFlatGeobufInBatchesToGeoJSON(stream, options);
}

function parseFlatGeobufInBatchesToBinary(stream, options: FlatGeobufLoaderOptions) {
  // TODO: reproject binary streaming features
  // const {reproject = false, _targetCrs = 'WGS84'} = (options && options.gis) || {};

  const iterator = deserializeGeneric(stream, binaryFromFeature);
  return iterator;
}

// eslint-disable-next-line complexity
async function* parseFlatGeobufInBatchesToGeoJSON(stream, options: FlatGeobufLoaderOptions) {
  const {reproject = false, _targetCrs = 'WGS84'} = (options && options.gis) || {};

  let headerMeta;
  const iterator = deserializeGeoJson(stream, false, (header) => {
    headerMeta = header;
  });

  let projection;
  let firstRecord = true;
  for await (const feature of iterator) {
    if (firstRecord) {
      const crs = headerMeta && headerMeta.crs;
      if (reproject && crs) {
        projection = new Proj4Projection({from: crs.wkt, to: _targetCrs});
      }

      firstRecord = false;
    }

    if (reproject && projection) {
      // eslint-disable-next-line
      yield transformGeoJsonCoords([feature], (coords) => projection.project(coords));
    } else {
      yield feature;
    }
  }
}
