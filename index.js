const { Api, JsonRpc } = require("enf-eosjs");
const { JsSignatureProvider } = require("enf-eosjs/dist/eosjs-jssig");
const fetch = require("node-fetch");
const { TextEncoder, TextDecoder } = require("util");

const { PGSQL } = require("./database/pgsql");
const StateReceiver = require("./statereceiver/statereceiver");

// It is only necessary to include a key to sign transactions. Not this example.
const signatureProvider = new JsSignatureProvider([]);

const rpc = new JsonRpc(process.env.RPC, { fetch });
const apiRpc = new Api({
  rpc,
  signatureProvider,
  textDecoder: new TextDecoder(),
  textEncoder: new TextEncoder(),
});

const whitelistAccount = ["eosio.token"];

/**
 * Handler for traces
 */
class TraceHandler {
  constructor() {
    this.processingQueue = false;
    this.queue = [];
    setInterval(this.processQueue.bind(this), 200);
  }

  /**
   * Cyclical process for managing the actions buffer
   */
  async processQueue() {
    // No actions or this is still processing? exit
    if (!this.queue.length || this.processingQueue) {
      return;
    }

    this.processingQueue = true;
    const itemProcess = this.queue.pop();
    const action = itemProcess.data[0];
    let retries = itemProcess.retries;

    // Too much retries? drop action and exit
    if (retries > 20) {
      console.log("Exceeded retries!");
      return;
    }

    try {
      /**
       * process data here
       * Sample: catch transactions greather than 10000 WAX
       */
      if (Number(action.data.quantity.split(" ")[0]) >= 10000) {
        console.log("Action", JSON.stringify(action), "\n");
        await PGSQL.pushTransfer(
          itemProcess.tx_id,
          itemProcess.block_num,
          Date.parse(itemProcess.block_timestamp),
          action.data
        );
      }

      this.processingQueue = false;
    } catch (error) {
      // Error? retry
      console.log(error);
      setTimeout(() => {
        retries++;
        this.queue.push(item);
      }, 1000 * retries);
    }
  }

  /**
   * This hock collects the traces of the blocks received from the SHIP through stateReceiver.
   * The module performs a content filter to add them to the buffer of actions to be evaluated.
   *
   * @param {*} block_num
   * @param {*} traces
   * @param {*} block_timestamp
   */
  async processTrace(block_num, traces, block_timestamp) {
    // Parse traces
    for (const trace of traces) {
      if (trace[0] === "transaction_trace_v0") {
        const tx_id = trace[1].id;
        for (const action of trace[1].action_traces) {
          if (action[0] === "action_trace_v1") {
            // Read eosio.token transfer (using whitelist)
            if (whitelistAccount.indexOf(action[1].receiver) !== -1) {
              try {
                // Deserialize action
                const actionDeser = await apiRpc.deserializeActions([
                  action[1].act,
                ]);
                // Add desereialize data to actions buffer
                this.queue.push({
                  data: actionDeser,
                  block_num: block_num,
                  block_timestamp: block_timestamp,
                  tx_id: tx_id,
                  retries: 0,
                });
              } catch (error) {
                console.log("Deserialized error.", error);
              }
            }
          }
        }
      }
    }
  }
}

const run = async () => {
  await PGSQL.connection();
  const START_BLOCK = await PGSQL.getLastBlock();
  console.log(`Starting WAXCrawler from block ${START_BLOCK}`);
  /**
   * Set stateReceiver
   */
  const sr = new StateReceiver({
    startBlock: START_BLOCK,
    endBlock: 0xffffffff,
    mode: 0,
    config: {
      eos: {
        wsEndpoint: process.env.WS,
      },
    },
    irreversibleOnly: false,
    verbose: false,
  });

  /**
   * Create handlers
   */
  const trace_handler = new TraceHandler();
  // const block_handler = new BlockHandler();
  // const delta_handler = new DeltaHandler();
  // [...]

  /**
   * Register handlers
   */
  sr.registerTraceHandler(trace_handler);
  // sr.registerBlockHandler(block_handler);
  // sr.registerDeltaHandler(delta_handler);
  // [...]

  /**
   * Start stateReceiver
   */
  sr.start();
};

run();
