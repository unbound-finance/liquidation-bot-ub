//goerli
require("dotenv").config();
const Web3 = require("web3");
const Provider = require("@truffle/hdwallet-provider");

const privateKey = process.env.privateKey;
const provider = new Provider(privateKey, goerliNodeUrl);
const web3 = new Web3(provider);

const ACCOUNT_MANAGER = require("../contractAbis/accountManager.json");
const feedAddress = "0xbe385bc1D5Fffc4698b5bdEb71815689686a2a7c";

const feedContract = new web3.eth.Contract(ACCOUNT_MANAGER, feedAddress);

const adminAddress = "0x113Fca29bE47647c26B4E9b5dFA040c4b2dFD11b"

const setPrice = async () => {
  try {
    const setValue = await feedContract.methods.setPrice("60000000000").send({
      from: adminAddress,
    });
    
    console.log("Sucess");

    //   console.log(setValue)
  } catch (e) {
    console.log("Error", e);
  }
};

setPrice();
