pragma solidity ^0.4.24;

import "../math/SafeMath.sol";

/**
 * @title PaymentSplitter
 * @dev This contract can be used when payments need to be received by a group
 * of people and split proportionately to some number of shares they own.
 */
contract PaymentSplitter {
    using SafeMath for uint256;

    event PayeeAdded(address account, uint256 shares);
    event PaymentReleased(address to, uint256 amount);
    event PaymentReceived(address from, uint256 amount);

    uint256 private _totalShares;
    uint256 private _totalReleased;

    mapping(address => uint256) private _shares;
    mapping(address => uint256) private _released;
    address[] private _payees;

    constructor(address[] payees, uint256[] shares) public payable {
        require(payees.length == shares.length);
        require(payees.length > 0);

        for (uint256 i = 0; i < payees.length; i++) {
            _addPayee(payees[i], shares[i]);
        }
    }

    // payable fallback
    function() external payable {
        emit PaymentReceived(msg.sender, msg.value);
    }

    // return the total shares of the contract
    function totalShares() public view returns (uint256) {
        return _totalShares;
    }

    // return total amount already released
    function totalReleased() public view returns (uint256) {
        return _totalReleased;
    }

    // return the amount already released to an account
    function released(address account) public view returns (uint256) {
        return _released[account];
    }

    // return address of a payee
    function payee(uint256 index) public view returns (uint256) {
        return _payees[index];
    }

    // Release of the payee's proportional payment
    function release(address account) public {
        require(_shares[account] > 0);

        uint256 totalReceived = address(this).balance.add(_totalReleased);
        uint256 payment = totalReceived
            .mul(_shares[account])
            .div(_totalShares)
            .sub(_released[account]);

        require(payments != 0);

        _released[account] = _released[account].add(payment);
        _totalReleased = _totalReleased.add(payment);

        account.transfer(payment);
        emit PaymentReleased(account, payment);
    }

    // Add new payee to the contract
    function _addPayee(address account, uint256 shares_) private {
        require(account != address(0));
        require(shares_ > 0);
        require(_shares[account] == 0);

        _payees.push(account);
        _shares[account] = shares_;
        _totalShares = _totalShares.add(shares_);
        emit PayeeAdded(account, shares_);
    }
}
