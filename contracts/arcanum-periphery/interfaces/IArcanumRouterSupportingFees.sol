pragma solidity >=0.8.0;

// SPDX-License-Identifier: MIT

interface IArcanumRouterSupportingFees {
    function FACTORY() external view returns (address);

    function WAVAX() external view returns (address);

    function MAX_FEE() external view returns (uint24);

    function FEE_FLOOR() external view returns (uint24);

    struct FeeInfo {
        uint24 feePartner;
        uint24 feeProtocol;
        uint24 feeTotal;
        uint24 feeCut;
        bool initialized;
    }

    function getFeeInfo(address feeTo)
        external
        view
        returns (
            uint24 feePartner,
            uint24 feeProtocol,
            uint24 feeTotal,
            uint24 feeCut,
            bool initialized
        );

    event PartnerActivated(
        address indexed partner,
        uint24 feePartner,
        uint24 feeProtocol,
        uint24 feeTotal,
        uint24 feeCut
    );
    event FeeChange(
        address indexed partner,
        uint24 feePartner,
        uint24 feeProtocol,
        uint24 feeTotal,
        uint24 feeCut
    );
    event ProtocolFee(
        address indexed partner,
        address indexed token,
        uint256 amount
    );
    event PartnerFee(
        address indexed partner,
        address indexed token,
        uint256 amount
    );
    event FeeWithdrawn(address indexed token, uint256 amount, address to);
    event FeeFloorChange(uint24 feeFloor);
    event ManagerChange(
        address indexed partner,
        address manager,
        bool isAllowed
    );

    function managers(address partner, address manager)
        external
        view
        returns (bool isAllowed);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline,
        address feeTo
    ) external returns (uint256[] memory amounts);

    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline,
        address feeTo
    ) external returns (uint256[] memory amounts);

    function swapExactAVAXForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline,
        address feeTo
    ) external payable returns (uint256[] memory amounts);

    function swapTokensForExactAVAX(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline,
        address feeTo
    ) external returns (uint256[] memory amounts);

    function swapExactTokensForAVAX(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline,
        address feeTo
    ) external returns (uint256[] memory amounts);

    function swapAVAXForExactTokens(
        uint256 amountOut,
        address[] calldata path,
        address to,
        uint256 deadline,
        address feeTo
    ) external payable returns (uint256[] memory amounts);

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline,
        address feeTo
    ) external;

    function swapExactAVAXForTokensSupportingFeeOnTransferTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline,
        address feeTo
    ) external payable;

    function swapExactTokensForAVAXSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline,
        address feeTo
    ) external;

    function activatePartner(address partner) external;

    function modifyManagement(
        address partner,
        address manager,
        bool isAllowed
    ) external;

    function modifyTotalFee(address partner, uint24 feeTotal) external;

    function modifyFeeCut(address partner, uint24 feeCut) external;

    function modifyFeeFloor(uint24 feeFloor) external;

    function withdrawFees(
        address[] calldata tokens,
        uint256[] calldata amounts,
        address to
    ) external;

    function quote(
        uint256 amountA,
        uint256 reserveA,
        uint256 reserveB
    ) external pure returns (uint256 amountB);

    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) external pure returns (uint256 amountOut);

    function getAmountIn(
        uint256 amountOut,
        uint256 reserveIn,
        uint256 reserveOut
    ) external pure returns (uint256 amountIn);

    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts);

    function getAmountsIn(uint256 amountOut, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts);
}
