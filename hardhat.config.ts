import { HardhatUserConfig, task } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import * as dotenv from 'dotenv'
import './tasks'

dotenv.config()


const config: HardhatUserConfig = {
  solidity: {
    compilers:
      [
        {
          version: '0.8.17'
        },
        {
          version: '0.8.14'
        },
        {
          version: '0.4.18'
        },
        {
          version: '0.5.16'
        }
      ]
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: false,
      forking: {
        url: process.env.BNB_MAINNET_RPC_URL || 'https://bsc-dataseed1.binance.org/'
        // blockNumber: 16538651
      }
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`
    },
    bnb: {
      url: process.env.BNB_MAINNET_RPC_URL || 'https://bsc-dataseed1.binance.org/'
    },
    bnbt: {
      url: process.env.BNB_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/'
    }
  }
  }

  export default config
