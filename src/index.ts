import { OPCUAServer, DataType, Variant } from "node-opcua";

interface Tag {
  value: number
}

interface RootState {
  tags: Array<Tag>
}

const tagsPerDevice = 1000;
const deviceCount = 30;
const overallTagCount = deviceCount * tagsPerDevice;

const createTags = (): Array<Tag> => {
  let tags: Array<Tag> = [];

  for (let i = 0; i < overallTagCount; i++) {
    tags.push({
      value: 0
    })
  }

  return tags;
}

const state: RootState = {
  tags: createTags()
};

const startValueGeneration = () => {
  return setInterval(() => {
    for (let tag of state.tags) {
      tag.value = Math.floor(Math.random() * 100);
    }
  }, 1000)
}

(async () => {
  try {
    const server = new OPCUAServer({
      port: 4334,
      serverCapabilities: {
        maxSubscriptions: 10000,
        maxSubscriptionsPerSession: 10000,
        maxMonitoredItemsPerSubscription: 10000,
        maxMonitoredItems: 1000000,
        maxMonitoredItemsQueueSize: 10000000
      }
    })

    await server.initialize()

    const addressSpace = server.engine.addressSpace

    if (addressSpace === null) {
      return;
    }

    const namespace = addressSpace.getOwnNamespace()

    const devices = new Array(deviceCount).fill(null).map((_, index) => namespace.addObject({
      organizedBy: addressSpace.rootFolder.objects,
      browseName: `MyDevice ${index}`
    }))

    devices.forEach((device, deviceIndex) => {
      for (let i = 0; i < tagsPerDevice; i++) {
        namespace.addVariable({
          componentOf: device,
          browseName: `Sensor value ${i + 1}`,
          minimumSamplingInterval: 100,
          dataType: "Double",
          value: {
            get: () => {
              return new Variant({
                dataType: DataType.Double,
                value: state.tags[deviceIndex * tagsPerDevice + i].value
              })
            }
          }
        })
      }
    })

    const generationTimerId = startValueGeneration()

    addressSpace.registerShutdownTask(() => {
      clearInterval(generationTimerId)
    })

    await server.start()
    console.log("Server is now listening ... ( press CTRL+C to stop)")  
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
})()