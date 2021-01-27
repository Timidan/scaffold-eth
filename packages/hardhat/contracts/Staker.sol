pragma solidity >=0.6.0 <0.7.0;

import "hardhat/console.sol";
import "./ExampleExternalContract.sol"; //https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol

contract Staker {

  ExampleExternalContract public exampleExternalContract;

  constructor(address exampleExternalContractAddress) public {
    exampleExternalContract = ExampleExternalContract(exampleExternalContractAddress);
  }

mapping(address=> uint256) public balances;

uint256 public constant threshold = 1 ether;

uint256 public deadline = now+30 seconds;


modifier highEnough() {
  require(address(this).balance>=threshold,"Not at threshold yet");
  _;
}

modifier notHighEnough {
  require(address(this).balance<threshold,"threshold already reached");
  _;
}

modifier deadlinePassed {
    require(now>deadline,"deadline not passed");
    _;
}

event Stake(address,uint256);

  // Collect funds in a payable `stake()` function and track individual `balances` with a mapping:
  //  ( make sure to add a `Stake(address,uint256)` event and emit it for the frontend <List/> display )
function stake() public payable {
balances[msg.sender]+=msg.value;
emit Stake(msg.sender,msg.value);

}

  // After some `deadline` allow anyone to call an `execute()` function
  //  It should either call `exampleExternalContract.complete{value: address(this).balance}()` to send all the value

function execute() public highEnough() deadlinePassed{
  exampleExternalContract.complete{value: address(this).balance}();
}

  // if the `threshold` was not met, allow everyone to call a `withdraw()` function
function withdraw(address payable _to) public notHighEnough{
require(balances[msg.sender]>0,"not a staker");
balances[msg.sender]=0;
_to.transfer(balances[msg.sender]);
}


  // Add a `timeLeft()` view function that returns the time left before the deadline for the frontend
function timeLeft() public view returns(uint256){
  if (now<deadline){
    return (deadline-now);
  }
  return 0;
}


}
