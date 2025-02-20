import test from 'tape-promise/tape';
import {Tiles3DLoader} from '@loaders.gl/3d-tiles';
import {load, fetchFile, setLoaderOptions, getLoaderOptions, isBrowser} from '@loaders.gl/core';
import {getWorkerURL, WorkerFarm} from '@loaders.gl/worker-utils';
import {DracoWriterWorker} from '@loaders.gl/draco';
import convertB3dmToI3sGeometry, {
  getPropertyTable
} from '../../../src/i3s-converter/helpers/geometry-converter';
import {PGMLoader} from '../../../src/pgm-loader';
import {calculateTransformProps} from '../../../../tiles/src/tileset/helpers/transform-utils';
import {createdStorageAttribute} from '../../../src/i3s-converter/helpers/feature-attributes';
import {I3SAttributesWorker} from '../../../src/i3s-attributes-worker';

const PGM_FILE_PATH = '@loaders.gl/tile-converter/test/data/egm84-30.pgm';
const FRANKFURT_B3DM_FILE_PATH =
  '@loaders.gl/tile-converter/test/data/Frankfurt/L5/OF/474_5548_-1_lv5_group_0.osgb_3.b3dm';
const BERLIN_B3DM_FILE_PATH =
  '@loaders.gl/tile-converter/test/data/Berlin/1511577738.buildings.b3dm';
const NEW_YORK_B3DM_FILE_PATH = '@loaders.gl/tile-converter/test/data/NewYork/75343/6/5/1.b3dm';
const FERRY_GLTF_FILE_PATH = '@loaders.gl/tile-converter/test/data/Ferry/754834/6/0000000.glb';

setLoaderOptions({
  _worker: 'test'
});

test('tile-converter - I3S Geometry converter # should convert Frankfurt tile content', async (t) => {
  if (isBrowser) {
    t.end();
    return;
  }
  async function testTileContent(draco, generateBoundingVolumes) {
    let nodeId = 1;
    const addNodeToNodePage = () => nodeId++;
    const featuresHashArray = [];
    const tileHeaderRequiredProps = {
      computedTransform: [
        1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 4055182.44018, 615965.038498, 4867494.346586, 1
      ],
      boundingVolume: {center: [4051833.805439, 618316.801881, 4870677.172590001]}
    };
    const tileContent = await load(FRANKFURT_B3DM_FILE_PATH, Tiles3DLoader);
    const propertyTable = getPropertyTable(tileContent);
    calculateTransformProps(tileHeaderRequiredProps, tileContent);
    const geoidHeightModel = await load(PGM_FILE_PATH, PGMLoader);
    const workerSource = await getWorkersSource();
    const attributeStorageInfo = [];
    try {
      const convertedResources = await convertB3dmToI3sGeometry(
        tileContent,
        addNodeToNodePage,
        propertyTable,
        featuresHashArray,
        attributeStorageInfo,
        draco,
        generateBoundingVolumes,
        geoidHeightModel,
        workerSource
      );
      t.ok(convertedResources);
      if (!convertedResources) {
        return;
      }
      t.equals(convertedResources.length, 1, 'Returns 1 node');
      const nodeResources = convertedResources[0];
      await checkNodeResources(
        nodeResources,
        {
          draco,
          vertexCount: 148281,
          attributesLength: 0,
          featureCount: 1,
          nonCompressedGeometryByteLength: 5338140,
          compressedGeometryByteLength: 2016506,
          texture: {
            mimeType: 'image/jpeg',
            width: 2048,
            height: 1024,
            bitmapByteLength: 8388608
          },
          boundingVolumes: generateBoundingVolumes
            ? {
                mbs: [8.62207030087592, 50.084050618016896, -217.21218885901865, 657.9565111182278],
                obb: {
                  center: [8.622050871641566, 50.084076204176576, -194.3917133680221],
                  halfSize: [611.3686583875675, 484.1319449471776, 365.7073438855587],
                  quaternion: [
                    0.478909280552476, -0.3432001871992151, 0.5224020278817846, 0.6164054297068876
                  ]
                }
              }
            : false
        },
        t
      );
    } finally {
      // Clean up worker pools
      const workerFarm = WorkerFarm.getWorkerFarm({});
      workerFarm.destroy();
    }
  }

  await testTileContent(true, false);
  await testTileContent(false, false);
  await testTileContent(true, true);

  t.end();
});

test('tile-converter - I3S Geometry converter # should convert Berlin tile content', async (t) => {
  if (isBrowser) {
    t.end();
    return;
  }
  let nodeId = 1;
  const addNodeToNodePage = () => nodeId++;
  const featuresHashArray = [];
  const draco = true;
  const generageBoundingVolumes = false;
  const tileHeaderRequiredProps = {
    computedTransform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    boundingVolume: {center: [3781178.760596639, 902182.0936989671, 5039803.738586299]}
  };
  const tileContent = await load(BERLIN_B3DM_FILE_PATH, Tiles3DLoader);
  const propertyTable = getPropertyTable(tileContent);
  calculateTransformProps(tileHeaderRequiredProps, tileContent);
  const geoidHeightModel = await load(PGM_FILE_PATH, PGMLoader);
  const workerSource = await getWorkersSource();
  const attributeStorageInfo = [];
  try {
    const convertedResources = await convertB3dmToI3sGeometry(
      tileContent,
      addNodeToNodePage,
      propertyTable,
      featuresHashArray,
      attributeStorageInfo,
      draco,
      generageBoundingVolumes,
      geoidHeightModel,
      workerSource
    );
    t.ok(convertedResources);
    if (!convertedResources) {
      return;
    }
    t.equals(convertedResources.length, 40, 'Returns 40 nodes');
    await checkNodeResources(
      convertedResources[0],
      {
        draco,
        vertexCount: 14025,
        attributesLength: 0,
        featureCount: 1,
        nonCompressedGeometryByteLength: 392724,
        compressedGeometryByteLength: 208506
      },
      t
    );
    await checkNodeResources(
      convertedResources[1],
      {
        draco,
        vertexCount: 69,
        attributesLength: 0,
        featureCount: 1,
        nonCompressedGeometryByteLength: 2508,
        compressedGeometryByteLength: 1673,
        texture: {
          mimeType: 'image/png',
          width: 64,
          height: 64,
          bitmapByteLength: 16384
        }
      },
      t
    );
  } finally {
    // Clean up worker pools
    const workerFarm = WorkerFarm.getWorkerFarm({});
    workerFarm.destroy();
  }

  t.end();
});

test('tile-converter - I3S Geometry converter # should convert New York tile content', async (t) => {
  if (isBrowser) {
    t.end();
    return;
  }
  let nodeId = 1;
  const addNodeToNodePage = () => nodeId++;
  const featuresHashArray = [];
  const draco = true;
  const generageBoundingVolumes = false;
  const tileHeaderRequiredProps = {
    computedTransform: [
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 4055182.44018, 615965.038498, 4867494.346586, 1
    ],
    boundingVolume: {center: [1319833.032477655, -4673588.626640962, 4120866.796624521]}
  };
  const tileContent = await load(NEW_YORK_B3DM_FILE_PATH, Tiles3DLoader);
  const propertyTable = getPropertyTable(tileContent);
  calculateTransformProps(tileHeaderRequiredProps, tileContent);
  const geoidHeightModel = await load(PGM_FILE_PATH, PGMLoader);
  const workerSource = await getWorkersSource();
  const attributeStorageInfo = getAttributeStorageInfo(propertyTable);
  try {
    const convertedResources = await convertB3dmToI3sGeometry(
      tileContent,
      addNodeToNodePage,
      propertyTable,
      featuresHashArray,
      attributeStorageInfo,
      draco,
      generageBoundingVolumes,
      geoidHeightModel,
      workerSource
    );
    t.ok(convertedResources);
    if (!convertedResources) {
      return;
    }
    t.equals(convertedResources.length, 1, 'Returns 1 node');
    const nodeResources = convertedResources[0];
    await checkNodeResources(
      nodeResources,
      {
        draco,
        vertexCount: 50286,
        attributesLength: 10,
        featureCount: 275,
        nonCompressedGeometryByteLength: 1412416,
        compressedGeometryByteLength: 608764
      },
      t
    );
  } finally {
    // Clean up worker pools
    const workerFarm = WorkerFarm.getWorkerFarm({});
    workerFarm.destroy();
  }

  t.end();
});

test('tile-converter - I3S Geometry converter # should convert Ferry tile content', async (t) => {
  if (isBrowser) {
    t.end();
    return;
  }
  let nodeId = 1;
  const addNodeToNodePage = () => nodeId++;
  const featuresHashArray = [];
  const draco = true;
  const generageBoundingVolumes = false;
  const tileHeaderRequiredProps = {
    computedTransform: [
      0.8443837640659682, -0.5357387973460459, 0, 0, 0.32832660036003297, 0.5174791372742712,
      0.7902005985709575, 0, -0.42334111834053034, -0.667232555788526, 0.6128482797708588, 0,
      -2703514.4440963655, -4261038.614006309, 3887533.151398322, 1
    ],
    boundingVolume: {center: [-2703528.7614193764, -4261014.993900511, 3887572.9889940596]}
  };
  const tileContent = await load(FERRY_GLTF_FILE_PATH, Tiles3DLoader);
  const propertyTable = getPropertyTable(tileContent);
  calculateTransformProps(tileHeaderRequiredProps, tileContent);
  const geoidHeightModel = await load(PGM_FILE_PATH, PGMLoader);
  const workerSource = await getWorkersSource();
  const attributeStorageInfo = getAttributeStorageInfo(propertyTable);
  try {
    const convertedResources = await convertB3dmToI3sGeometry(
      tileContent,
      addNodeToNodePage,
      propertyTable,
      featuresHashArray,
      attributeStorageInfo,
      draco,
      generageBoundingVolumes,
      geoidHeightModel,
      workerSource
    );
    t.ok(convertedResources);
    if (!convertedResources) {
      return;
    }
    t.equals(convertedResources.length, 1, 'Returns 1 node');
    const nodeResources = convertedResources[0];
    await checkNodeResources(
      nodeResources,
      {
        draco,
        vertexCount: 36858,
        attributesLength: 3,
        featureCount: 3,
        nonCompressedGeometryByteLength: 1326944,
        compressedGeometryByteLength: 1236750,
        texture: {
          mimeType: 'image/jpeg',
          width: 355,
          height: 356,
          bitmapByteLength: 505520
        }
      },
      t
    );
  } finally {
    // Clean up worker pools
    const workerFarm = WorkerFarm.getWorkerFarm({});
    workerFarm.destroy();
  }

  t.end();
});

async function getWorkersSource() {
  const result = {draco: '', I3SAttributes: ''};
  const url = getWorkerURL(DracoWriterWorker, {...getLoaderOptions()});
  let sourceResponse = await fetchFile(url);
  let source = await sourceResponse.text();
  result.draco = source;

  const i3sAttributesWorkerUrl = getWorkerURL(I3SAttributesWorker, {...getLoaderOptions()});
  sourceResponse = await fetchFile(i3sAttributesWorkerUrl);
  source = await sourceResponse.text();
  result.I3SAttributes = source;

  return result;
}

const OBJECT_ID_TYPE = 'OBJECTID';
const STRING_TYPE = 'string';
const SHORT_INT_TYPE = 'Int32';
const DOUBLE_TYPE = 'double';
function getAttributeType(key, attribute) {
  if (key === OBJECT_ID_TYPE) {
    return OBJECT_ID_TYPE;
  }
  if (typeof attribute === STRING_TYPE) {
    return STRING_TYPE;
  } else if (typeof attribute === 'number') {
    return Number.isInteger(attribute) ? SHORT_INT_TYPE : DOUBLE_TYPE;
  }
  return STRING_TYPE;
}

function getAttributeStorageInfo(propertyTable) {
  let attributeIndex = 0;
  const propertyTableWithObjectId = {
    OBJECTID: [0],
    ...propertyTable
  };

  const result = [];
  for (const key in propertyTableWithObjectId) {
    const firstAttribute = propertyTableWithObjectId[key][0];
    const attributeType = getAttributeType(key, firstAttribute);
    const storageAttribute = createdStorageAttribute(attributeIndex, key, attributeType);
    result.push(storageAttribute);
    attributeIndex += 1;
  }
  return result;
}

async function checkNodeResources(resources, expectedValues, t) {
  const {
    draco,
    vertexCount,
    attributesLength,
    featureCount,
    nonCompressedGeometryByteLength,
    compressedGeometryByteLength,
    texture,
    boundingVolumes
  } = expectedValues;
  t.equals(resources.vertexCount, vertexCount);
  t.equals(resources.attributes.length, attributesLength);
  t.equals(resources.featureCount, featureCount);
  t.equals(resources.geometry.length, nonCompressedGeometryByteLength);

  if (draco) {
    t.ok(resources.compressedGeometry instanceof Promise);
    const compressedGeometry = await resources.compressedGeometry;
    t.equals(compressedGeometry.byteLength, compressedGeometryByteLength);
  }

  if (texture) {
    t.equals(resources.texture.mimeType, texture.mimeType);
    t.equals(resources.texture.image.width, texture.width);
    t.equals(resources.texture.image.height, texture.height);
    t.equals(resources.texture.image.data.length, texture.bitmapByteLength);
    t.ok(resources.texture.bufferView);
  } else {
    t.notOk(resources.texture);
  }

  if (boundingVolumes) {
    t.equals(JSON.stringify(resources.boundingVolumes), JSON.stringify(boundingVolumes));
  } else {
    t.notOk(resources.boundingVolumes);
  }
}
