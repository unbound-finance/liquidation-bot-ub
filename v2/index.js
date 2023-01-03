const Web3 = require("web3");
const Provider = require("@truffle/hdwallet-provider");
const ABI = require("./config/abi.json");
require('dotenv').config()

const WEB3_HTTP_NODE_URL = process.env.nodeHttpUrl;
const WEB3_WSS_NODE_URL = process.env.nodeWssUrl;

const ACCOUNT_MANAGER_ADDRESS = "0x24aa4914f476526aF9Eac4B9c5B9C090FCEfe5AB";

//Private Key and address for admin wallet which holds the UND balance
const adminAddress = "0x6ae549b3e279DE338E4d79f6f897b66BD392C453";
const privateKey = process.env.privateKey; // without 0x

const web3Http = new Web3(new Provider(privateKey, WEB3_HTTP_NODE_URL));
const web3Wss = new Web3(new Web3.providers.WebsocketProvider(WEB3_WSS_NODE_URL));

const accountManager = new web3Http.eth.Contract(ABI, ACCOUNT_MANAGER_ADDRESS)

async function main() {

    let lock = false

    web3Wss.eth.subscribe('newBlockHeaders', (error, block) => {

        if (!error) {
            console.log(`New Block Mined: ${block.number}`)

            if (lock == false) {
                lock = true

                try {

                    accountManager.methods.liquidateAccounts(5).estimateGas({ from: adminAddress }, function (etimateErr, gasAmount) {
                        if (etimateErr) {
                            if (!etimateErr.toString().includes("AccountManager: nothing to liquidate")) {
                                console.log({ etimateErr })
                            }
                        } else {
                            console.log("Found liquitable account....")
                            accountManager.methods.liquidateAccounts(5)
                                .send({ from: adminAddress, gas: gasAmount }, function (txErr, transactionHash) {
                                    if (txErr) {
                                        console.log("Error while executing transaction: ")
                                        console.log({ txErr })
                                    } else {
                                        console.log("Liquidation Transaction sent: ", transactionHash)
                                    }
                                })
                        }
                    })

                } catch (catchErr) {
                    console.log({ catchErr })
                }

                lock = false
            }

        } else {
            console.log({ error })
        }

    })

}
main()