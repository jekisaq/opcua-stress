import { OPCUAServer, DataType, standardUnits, Variant, UAAnalogItem } from "node-opcua";

interface Tag {
  value: number
}

interface RootState {
  tags: Array<Tag>
}

const tagCount = 1000;

const createTags = (): Array<Tag> => {
  let tags: Array<Tag> = [];

  for (let i = 0; i < tagCount; i++) {
    tags.push({
      value: 0
    })
  }

  return tags;
}

const state: RootState = {
  tags: createTags()
};

const startGeneration = () => {
  return setInterval(() => {
    for (let tag of state.tags) {
      tag.value = Math.floor(Math.random() * 100);
    }
  }, 1000)
}

(async () => {
  try {
    const server = new OPCUAServer({
      port: 4334
    })

    await server.initialize()

    const addressSpace = server.engine.addressSpace

    if (addressSpace === null) {
      return;
    }

    const namespace = addressSpace.getOwnNamespace()

    const device = namespace?.addObject({
      organizedBy: addressSpace.rootFolder.objects,
      browseName: "MyDevice"
    })

    for (let i = 0; i < tagCount; i++) {
      namespace.addAnalogDataItem<number, DataType.Double>({
        componentOf: device,
        browseName: `Sensor ${i + 1}`,
        definition: "",
        valuePrecision: 0.5,
        engineeringUnitsRange: { low: 100 , high: 200},
        instrumentRange: { low: -100 , high: +200},
        engineeringUnits: standardUnits.degree_celsius,
        minimumSamplingInterval: 100,
        dataType: "Double",
        value: {
          get: () => {
            return new Variant({
              dataType: DataType.Double,
              value: state.tags[i].value
            })
          }
        }
      })
    }

    const generationId = startGeneration()



    addressSpace.registerShutdownTask(() => {
      clearInterval(generationId)
    })





    await server.start()
    console.log("Server is now listening ... ( press CTRL+C to stop)")  
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
})()