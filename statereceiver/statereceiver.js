/**
 * From eosdac/eosio-statereceiver
 * https://github.com/eosdac/eosio-statereceiver
 */

const { Connection } = require("./connections");

class StateReceiver {
  constructor({
    startBlock = 0,
    endBlock = 0xffffffff,
    config,
    mode = 0,
    irreversibleOnly = false,
    verbose = false,
  }) {
    this.trace_handlers = [];
    this.delta_handlers = [];
    this.done_handlers = [];
    this.progress_handlers = [];
    this.connected_handlers = [];
    this.block_handlers = [];
    this.fork_handlers = [];
    this.irreversible_only = irreversibleOnly;

    this.config = config;
    this.mode = mode;

    this.start_block = startBlock;
    this.end_block = endBlock;
    this.current_block = -1;
    this.complete = true;

    const mode_str = mode == 0 ? "serial" : "parallel";

    console.log(
      `Created StateReceiver, Start : ${startBlock}, End : ${endBlock}, Mode : ${mode_str}`
    );
  }

  parseDate(fullStr) {
    const [fullDate] = fullStr.split(".");
    const [dateStr, timeStr] = fullDate.split("T");
    const [year, month, day] = dateStr.split("-");
    const [hourStr, minuteStr, secondStr] = timeStr.split(":");

    const dt = new Date();
    dt.setUTCFullYear(year);
    dt.setUTCMonth(month - 1);
    dt.setUTCDate(day);
    dt.setUTCHours(hourStr);
    dt.setUTCMinutes(minuteStr);
    dt.setUTCSeconds(secondStr);

    return dt.getTime();
  }

  registerBlockHandler(h) {
    this.block_handlers.push(h);
  }

  registerDoneHandler(h) {
    this.done_handlers.push(h);
  }

  registerTraceHandler(h) {
    this.trace_handlers.push(h);
  }

  registerDeltaHandler(h) {
    this.delta_handlers.push(h);
  }

  registerProgressHandler(h) {
    this.progress_handlers.push(h);
  }

  registerForkHandler(h) {
    this.fork_handlers.push(h);
  }

  registerConnectedHandler(h) {
    this.connected_handlers.push(h);
  }

  status() {
    const start = this.start_block;
    const end = this.end_block;
    const current = this.current_block;

    return { start, end, current };
  }

  async start() {
    this.complete = false;

    this.connection = new Connection({
      socketAddress: this.config.eos.wsEndpoint,
      socketAddresses: this.config.eos.wsEndpoints,
      receivedAbi: (() => {
        this.requestBlocks();

        this.connected_handlers.forEach(
          ((handler) => {
            handler(this.connection);
          }).bind(this)
        );
      }).bind(this),
      receivedBlock: this.receivedBlock.bind(this),
    });
  }

  async restart(startBlock, endBlock) {
    this.complete = false;

    this.start_block = startBlock;
    this.end_block = endBlock;

    this.connection = new Connection({
      socketAddress: this.config.eos.wsEndpoint,
      socketAddresses: this.config.eos.wsEndpoints,
      receivedAbi: (() => {
        this.requestBlocks();

        this.connected_handlers.forEach(
          ((handler) => {
            handler(this.connection);
          }).bind(this)
        );
      }).bind(this),
      receivedBlock: this.receivedBlock.bind(this),
    });
    // await this.requestBlocks()
  }

  destroy() {
    console.log(`Destroying (TODO)`);
  }

  async requestBlocks() {
    try {
      this.current_block = 0;

      await this.connection.requestBlocks({
        irreversible_only: this.irreversible_only,
        start_block_num: parseInt(this.start_block),
        end_block_num: parseInt(this.end_block),
        have_positions: [],
        fetch_block: true,
        fetch_traces: this.trace_handlers.length > 0,
        fetch_deltas: this.delta_handlers.length > 0,
      });
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  }

  async handleFork(block_num) {
    this.fork_handlers.forEach((h) => {
      h(block_num);
    });
  }

  async receivedBlock(response, block, traces, deltas) {
    if (!response.this_block) return;
    let block_num = response.this_block.block_num;

    if (this.mode === 0 && block_num <= this.current_block) {
      console.log(
        `Detected fork in serial mode: current:${block_num} <= head:${this.current_block}`
      );
      await this.handleFork(block_num);
    }

    this.complete = false;

    this.current_block = block_num;

    // if (!(block_num % 1000)) {
    //   console.info(`StateReceiver : received block ${block_num}`);
    //   let { start, end, current } = this.status();
    //   console.info(`Start: ${start}, End: ${end}, Current: ${current}`);
    // }

    let block_timestamp = null;
    if (block) {
      block_timestamp = new Date(
        this.parseDate(block.timestamp.replace([".000", ".500"], "Z"))
      );
    } else {
      block_timestamp = new Date();
    }

    if (deltas && deltas.length) {
      this.delta_handlers.forEach(
        ((handler) => {
          if (this.mode === 0) {
            handler.processDelta(
              block_num,
              deltas,
              this.connection.types,
              block_timestamp
            );
          } else {
            handler.queueDelta(
              block_num,
              deltas,
              this.connection.types,
              block_timestamp
            );
          }
        }).bind(this)
      );
    }

    if (traces) {
      this.trace_handlers.forEach((handler) => {
        if (this.mode === 0) {
          handler.processTrace(block_num, traces, block_timestamp);
        } else {
          handler.queueTrace(block_num, traces, block_timestamp);
        }
      });
    }
    if (block) {
      this.block_handlers.forEach((handler) => {
        if (this.mode === 0) {
          handler.processBlock(block_num, block);
        } else {
          handler.queueBlock(block_num, block);
        }
      });
    }

    if (this.current_block === this.end_block - 1) {
      console.log(`State Handler complete!`);
      this.complete = true;
      this.done_handlers.forEach((handler) => {
        handler();
      });
      this.connection.disconnect();
    }

    this.progress_handlers.forEach((handler) => {
      handler(100 * ((block_num - this.start_block) / this.end_block));
    });
  } // receivedBlock
}

module.exports = StateReceiver;
