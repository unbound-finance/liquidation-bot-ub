const Web3 = require("web3");
const Provider = require("@truffle/hdwallet-provider");
const ABI = require("./config/abi.json");
var fs = require("fs");

require('dotenv').config()

const WEB3_HTTP_NODE_URL = process.env.nodeHttpUrl;
const WEB3_WSS_NODE_URL = process.env.nodeWssUrl;

const VAULTS = [
    { accManagerAddress: "0xc71A2ED3BC4cFcA06824e4175093fc7503aA4cB0", vaultName: "WETH-USDT-DESHARE"},
    { accManagerAddress: "0x5976Bf3bc4c01F9Bb20EAdF9906c4403615A0672", vaultName: "DAI-USDC-DESHARE"},
    { accManagerAddress: "0x3c657C6479D8f38861eF4Bcbf1aa0dbf538b126d", vaultName: "WETH-USDT-LP"},
    { accManagerAddress: "0x49Ac6364cD2e974489523a767858D149FfCf9677", vaultName: "DAI-USDC-LP"}
]

//Private Key and address for admin wallet which holds the UND balance
const adminAddress = process.env.ADDRESS;
const privateKey = process.env.PRIVATE_KEY; // without 0x

const web3Http = new Web3(new Provider(privateKey, WEB3_HTTP_NODE_URL));
const web3Wss = new Web3(new Web3.providers.WebsocketProvider(WEB3_WSS_NODE_URL));

const accManagerInstance0 = new web3Http.eth.Contract(ABI, VAULTS[0].accManagerAddress)
const accManagerInstance1 = new web3Http.eth.Contract(ABI, VAULTS[1].accManagerAddress)
const accManagerInstance2 = new web3Http.eth.Contract(ABI, VAULTS[2].accManagerAddress)
const accManagerInstance3 = new web3Http.eth.Contract(ABI, VAULTS[3].accManagerAddress)

async function main() {

    let lock = false

    web3Wss.eth.subscribe('newBlockHeaders', async (error, block) => {

        if (!error) {
            console.log(`New Block Mined: ${block.number}`)

            if (lock == false) {
                lock = true

                try {

                    let tx1 = _checkAndPerformLiquidation(accManagerInstance0, VAULTS[0].vaultName);
                    let tx2 = _checkAndPerformLiquidation(accManagerInstance1, VAULTS[1].vaultName);
                    let tx3 = _checkAndPerformLiquidation(accManagerInstance2, VAULTS[2].vaultName);
                    let tx4 = _checkAndPerformLiquidation(accManagerInstance3, VAULTS[3].vaultName);

                    await Promise.all([
                        waitForConfirmation(tx1), 
                        waitForConfirmation(tx2), 
                        waitForConfirmation(tx3), 
                        waitForConfirmation(tx4), 
                    ])

                    lock = false


                } catch (catchErr) {
                    console.log({ catchErr })
                    fs.appendFile('./logs/errors.txt', Date.now() + " - catch error: " + catchErr.toString() + ",\n", (err) => { });
                    lock = false
                }

            }

        } else {
            console.log({ error })
            fs.appendFile('./logs/errors.txt', Date.now() + " - error while reading block: " + error.toString() + ",\n", (err) => { });
        }

    })

}

function _checkAndPerformLiquidation(accManagerInstance, vaultName){
    accManagerInstance.methods.liquidateAccounts(5).estimateGas({ from: adminAddress }, function (etimateErr, gasAmount) {
        if (etimateErr) {
            if (!etimateErr.toString().includes("AccountManager: nothing to liquidate")) {
                console.log(vaultName, " - ", etimateErr)
                fs.appendFile('./logs/errors.txt', "Vault: " + vaultName + " - " + Date.now() + " - estimate error: " + etimateErr.message + ",\n", (err) => { });
            }
        } else {
            // console.log("Found liquitable account....")
            accManagerInstance.methods.liquidateAccounts(5)
                .send({ from: adminAddress, gas: gasAmount }, function (txErr, transactionHash) {
                    if (txErr) {
                        console.log("Error while executing transaction: ")
                        console.log(vaultName + " - " + txErr.toString())
                        fs.appendFile('./logs/errors.txt', "Vault: " + vaultName + " - " + Date.now() + " - execution error: " + txErr.toString() + ",\n", (err) => { });
                    } else {
                        console.log(vaultName + " - " + "Liquidation Transaction sent: ", transactionHash)
                        fs.appendFile('./logs/logs.txt', "Vault: " + vaultName + " - " + Date.now() + " - Liquidation Transaction sent: " + transactionHash + ",\n", (err) => { });
                    }
                })
        }
    })
}

async function waitForConfirmation (txHash) {

    return new Promise(function(resolve, reject){
        if(!txHash) {
            resolve(false);
        } else {
    
            let txCheck = setInterval(()=>{
                console.log('txcheck====')
                web3Http.eth.getTransactionReceipt(txHash, function(err, response){
                    if(!err){
                        console.log(response ? "true" : "false")
                        if(response != null){
                            if(response.status == '0x0'){
                                clearInterval(txCheck)
                                resolve(false)
                            } else if(response.status == '0x1'){
                                clearInterval(txCheck)
                                resolve(true)
                            }
                        }
                    }
                })
            }, 2000)

        }
    })
}

main()