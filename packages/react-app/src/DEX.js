import React, { useState } from 'react'
import { ethers } from "ethers";
import Blockies from 'react-blockies';
import { Card, Row, Col, List, Input, Button, Divider } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { useContractLoader, useContractReader, useEventListener, useBlockNumber, useBalance, useTokenBalance, useCustomContractReader } from "./hooks"
import { Transactor } from "./helpers"
import { Address, TokenBalance, Timeline, Bridge } from "./components"
import Curve from './Curve.js'
const { Meta } = Card;

const contractName = "DEX"


export default function DEX(props) {

  const tx = props.xdaiTx

  const localBlockNumber = useBlockNumber(props.localProvider)
  const localBalance = useBalance(props.localProvider,props.address)

  const writeContracts = useContractLoader(props.injectedProvider);

  const contractAddress = props.readContracts?props.readContracts[contractName].address:""
  const contractBalance = useBalance(props.localProvider,contractAddress)

  //const tokenBalance = useTokenBalance(props.readContracts, tokenName, contractAddress, props.localProvider)
  const tokenBalance = useCustomContractReader(props.tokenContract,"balanceOf",[ contractAddress ])
  const tokenBalanceFloat = parseFloat(ethers.utils.formatEther(tokenBalance?tokenBalance:0))
  const ethBalance = useBalance(  props.localProvider, contractAddress )
  const ethBalanceFloat = parseFloat(ethers.utils.formatEther(ethBalance))

  const liquidity = useContractReader(props.readContracts,contractName,"liquidity",[props.address])

  let display = []

  const [ form, setForm ] = useState({})
  const [ values, setValues ] = useState({})

  const rowForm = (title,icon,onClick)=>{
    return (
      <Row>
        <Col span={8} style={{textAlign:"right",opacity:0.333,paddingRight:6,fontSize:24}}>{title}</Col>
        <Col span={16}>
          <div style={{cursor:"pointer",margin:2}}>
            <Input
              onChange={(e)=>{
                let newValues = {...values}
                newValues[title] = e.target.value
                setValues(newValues)
              }}
              value={values[title]}
              addonAfter={
                <div type="default" onClick={()=>{
                  onClick(values[title])
                  let newValues = {...values}
                  newValues[title] = ""
                  setValues(newValues)
                }}>{icon}</div>
              }
            />
          </div>
        </Col>
      </Row>
    )
  }


  if(props.readContracts && props.readContracts[contractName]){

    display.push(
      <div>

        {rowForm("ethToToken","💸",async (value)=>{
          let valueInEther = ethers.utils.parseEther(""+value)
          let swapEthToTokenResult = await tx( writeContracts[contractName]["ethToToken"]({value: valueInEther}) )
          console.log("swapEthToTokenResult:",swapEthToTokenResult)
        })}

        {rowForm("tokenToEth","🔏",async (value)=>{
          let valueInEther = ethers.utils.parseEther(""+value)
          console.log("valueInEther",valueInEther)
          let allowance =  await props.tokenContract.allowance(props.address,props.readContracts[contractName].address)
          console.log("allowance",allowance)
          let nonce = await props.injectedProvider.getTransactionCount(props.address)
          console.log("nonce",nonce)
          let approveTx
          if(allowance.lt(valueInEther)){
            approveTx = tx( props.writeTokenContract.approve(contractAddress,valueInEther,{gasLimit:200000, gasPrice:1000000000, nonce:nonce++}) )
            console.log("approve tx is in, not waiting on it though...",approveTx)
            setTimeout(()=>{
              let swapTx = tx( writeContracts[contractName]["tokenToEth"](valueInEther,{gasLimit:200000, gasPrice:1000000000, nonce:nonce}) )
            },1500)

          }else{
            let swapTx = tx( writeContracts[contractName]["tokenToEth"](valueInEther,{gasLimit:200000, gasPrice:1000000000, nonce:nonce}) )
          }

          /*if(approveTx){
            console.log("waiting on approve to finish...")
            let approveTxResult = await approveTx;
            console.log("approveTxResult:",approveTxResult)
          }
          let swapTxResult = await swapTx;
          console.log("swapTxResult:",swapTxResult)*/
        })}

        <Divider> Liquidity ({liquidity?ethers.utils.formatEther(liquidity):"none"}):</Divider>

        {rowForm("deposit","📥",async (value)=>{
          let valueInEther = ethers.utils.parseEther(""+value)
          let valuePlusExtra = ethers.utils.parseEther(""+value*1.03)
          console.log("valuePlusExtra",valuePlusExtra)
          let allowance =  await props.tokenContract.allowance(props.address,props.readContracts[contractName].address)
          console.log("allowance",allowance)
          let nonce = await props.injectedProvider.getTransactionCount(props.address)
          console.log("nonce",nonce)
          let approveTx
          if(allowance.lt(valuePlusExtra)){
            console.log("CALLING APPROVE OF",props.writeTokenContract)
            approveTx = tx( props.writeTokenContract.approve(props.address,valuePlusExtra,{gasLimit:200000 , nonce:nonce++}) )
            console.log("approve tx is in, not waiting on it though...",approveTx)
            setTimeout(()=>{
                let depositTx = tx( writeContracts[contractName]["deposit"]({value: valueInEther, gasLimit:200000, nonce:nonce}) )
            },1500)
          }else{
            let depositTx = tx( writeContracts[contractName]["deposit"]({value: valueInEther, gasLimit:200000, nonce:nonce}) )
            //console.log("waiting on approve to finish...")
            //let approveTxResult = await approveTx;
            //console.log("approveTxResult:",approveTxResult)
            //let depositTxResult = await depositTx;
            //console.log("depositTxResult:",depositTxResult)
          }


        })}

        {rowForm("withdraw","📤",async (value)=>{
          let valueInEther = ethers.utils.parseEther(""+value)
          console.log("withdrawing:",valueInEther)
          let withdrawTxResult = await tx( writeContracts[contractName]["withdraw"](valueInEther,{ gasLimit:200000 }) )
          console.log("withdrawTxResult:",withdrawTxResult)
        })}

      </div>
    )
  }



  let tokenDivider = 100

  const [addingEth, setAddingEth] = useState();
  const [addingToken, setAddingToken] = useState();

  return (
    <div style={{position:"relative"}}>

      <div style={{zIndex:2,width:200,position:"absolute",top:64,left:(props.size.width/2)-100}}>
        <Address value={contractAddress} blockExplorer={"https://blockscout.com/poa/xdai/address/"}/>
      </div>

      <div style={{width:550,height:500,margin:"auto"}}>
        <Curve
          addingEth={addingEth}
          ethReserveDisplay={ethBalanceFloat.toFixed(4)+" xDAI"}
          tokenReserveDisplay={tokenBalanceFloat.toFixed(4)+" xMOON"}
          addingToken={addingToken}
          ethReserve={ethBalanceFloat}
          tokenReserve={tokenBalanceFloat/tokenDivider}
          width={500} height={500}
          tokenDivider={tokenDivider}//i think this adjusts to get the dot in the middle ... sort of what you _think_ the ratio should be
        />
      </div>

      <div style={{padding:16,width:550,margin:"auto"}}>

        <Bridge
          dexMode={true}
          topBalance={tokenBalance}
          bottomBalance={ethBalance}
          upText={"xDAI to xMOON"}
          downText={"xMOON to xDAI"}
          /*topNetwork="Rinkeby"*/
          topNetwork="https://dai.poa.network"
          bottomBalance={0}
          bottomNetwork="https://dai.poa.network"
          upDisabled={!props.injectedNetwork || props.injectedNetwork.chainId != 100}
          downDisabled={!props.injectedNetwork || props.injectedNetwork.chainId != 100}

          onUpdate={(mode,amount)=>{
            //console.log(mode,amount)
            if(mode=="up"){
              setAddingEth(amount)
              setAddingToken(0)
            } else if(mode=="down"){
              setAddingEth(0)
              setAddingToken(amount/tokenDivider)
            } else{
              setAddingEth(0)
              setAddingToken(0)
            }
          }}

          transferDown = { async (value)=>{
            let valueInEther = ethers.utils.parseEther(""+value)
            console.log("valueInEther",valueInEther)
            let allowance =  await props.tokenContract.allowance(props.address,props.readContracts[contractName].address)
            console.log("allowance",allowance)
            let nonce = await props.injectedProvider.getTransactionCount(props.address)
            console.log("nonce",nonce)
            let approveTx
            if(allowance.lt(valueInEther)){
              approveTx = tx( props.writeTokenContract.approve(contractAddress,valueInEther,{gasLimit:200000, gasPrice:1000000000, nonce:nonce++}) )
              console.log("approve tx is in, not waiting on it though...",approveTx)
              setTimeout(()=>{
                let swapTx = tx( writeContracts[contractName]["tokenToEth"](valueInEther,{gasLimit:200000, gasPrice:1000000000, nonce:nonce}) )
              },1500)

            }else{
              let swapTx = tx( writeContracts[contractName]["tokenToEth"](valueInEther,{gasLimit:200000, gasPrice:1000000000, nonce:nonce}) )
            }
          }}
          transferUp = { async (value)=>{
            let valueInEther = ethers.utils.parseEther(""+value)
            let swapEthToTokenResult = await tx( writeContracts[contractName]["ethToToken"]({value: valueInEther}) )
            console.log("swapEthToTokenResult:",swapEthToTokenResult)
          }}
        />
      </div>





    <div></div>

      {/*<Card
        title={(
          <div>

            <div style={{float:'right',fontSize:24}}>
              {parseFloat(ethers.utils.formatEther(contractBalance)).toFixed(4)} ⚖️
              <TokenBalance img={"🌒"} address={contractAddress} balance={tokenBalance} />

            </div>
          </div>
        )}
        size="large"
        style={{ width: 550, marginTop: 25 }}
        loading={false}>
        { display }
      </Card>*/}

    </div>
  );

}
