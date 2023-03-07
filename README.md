# Contract

### Contract Development
```shell
yarn compile
yarn test
yarn script <script-file-path>
```

### Lint
```shell
yarn lint
```


This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.ts
```

### Running local testnode with deployed contracts
```shell
yarn testnode
```
You should see the addresses in the following example output in **color red**:
```shell
...
[0] eth_chainId
[0] eth_getTransactionReceipt
[1] Lock with 1 ETH and unlock timestamp 1708795819 deployed to 0x73C68f1f41e4890D06Ba3e71b9E9DfA555f1fb46
[1] Account Bond NFT deployed to 0xD2D5e508C82EFc205cAFA4Ad969a4395Babce026
[1] sleep 5 && npx hardhat run --network localhost scripts/deploy.ts exited with code 0
...
```

### Getting testing ETH
1. Set the env variable `TESTING_METAMASK_ADDRESS` value to your desired testing address
2. Run `yarn testnode`, then 30 ETH will be sent to your testing address
