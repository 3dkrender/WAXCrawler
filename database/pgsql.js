const { Client } = require('pg');

class PostgreSQL {
    
    constructor(){
        this.client = null;
        this.connection();
    }

    async connection(){
        const connectionData = {
            user: process.env.PG_USER,
            host: process.env.PG_HOST,
            database: process.env.PG_DB,
            password: process.env.PG_KEY,
            port: 5432,
        };
        try {
            this.client = new Client(connectionData);
            await this.client.connect();
            console.log('Conectado a base de datos de Atomic');
        } catch (error) {
            console.log(error);
        }
    }

    async getLastBlock(){
      try {
        const query = 'select last_block from lastblock';
        const result = await this.client.query(query);
        return Number(result.rows[0].last_block);
      } catch (error) {
        console.error(error);
      }
    }

    async updateLastBlock(block_num){
      try {
        const query = `update lastblock set last_block = ${block_num}`;
        const result = await this.client.query(query);
        console.log('Update last_block', block_num);
        return result;
      } catch (error) {
        console.error(error);
      }
    }

    async pushTransfer( tx_id, at_block, at_time, data){
      try {
        const query = `insert into token_transfer
          (tx_id, token_name, sender, receiver, amount, memo, at_block, at_time)
          values
          ('${tx_id}', '${data.quantity.split(' ')[1]}', '${data.from}', '${data.to}', ${Number(data.quantity.split(' ')[0])}, '${data.memo}', ${Number(at_block)}, ${Number(at_time)})`;
        const result = await this.client.query(query);
        if(result){
          console.log('Push transfer:', JSON.stringify(data))
          this.updateLastBlock(at_block);
        }
      } catch (error) {
        console.error(error);
      }
    }
  }

module.exports.PGSQL = new PostgreSQL();