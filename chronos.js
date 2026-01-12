import { ExponentialCost, FirstFreeCost, LinearCost } from "../api/Costs";
import { Localization } from "../api/Localization";
import { parseBigNumber, BigNumber } from "../api/BigNumber";
import { theory } from "../api/Theory";
import { Utils } from "../api/Utils";
import { FreeCost } from "./api/Costs";

var id = "chronos";
var name = "Chronos";
var description = "A minimalistic, full idle theory";
var authors = "pacowoc";
var version = 1;
var alwaysShowRefundButtons = () => true;
var Exponent = BigNumber.ZERO;
var t = BigNumber.ZERO;
var maxLevel = 1;
var realExponent = BigNumber.ZERO;
var kDecreaseP = ui.createPopup({
    title: "What are you doing?",
    content: ui.createLabel({
        text: "The new exponent is lower than or equal to the old exponent, you are resetting t for nothing!",
        horizontalTextAlignment: TextAlignment.CENTER,
    }),
    closeOnBackgroundClicked: true,
})
var init = () => {
    currency = theory.createCurrency();
    {
        let getDesc = (level) => "c=" + (level+1);
        c = theory.createUpgrade(0, currency, new ExponentialCost(5, Math.log2(10)/10));
        c.getDescription = (_) => Utils.getMath(getDesc(c.level));
        c.getInfo = (amount) => Utils.getMathTo(getDesc(c.level), getDesc(c.level + amount));
        c.boughtOrRefunded = (_) => {
            theory.invalidatePrimaryEquation();
            updateExponent();
        }
    }
    // a
    {
        let getDesc = (level) => "a=" + (1+level);
        a = theory.createUpgrade(1, currency, new FreeCost());
        a.getDescription = (_) => Utils.getMath(getDesc(a.level));
        a.getInfo = (amount) => Utils.getMathTo(getDesc(a.level), getDesc(a.level + amount));
        a.boughtOrRefunded = (_) => {
            theory.invalidateSecondaryEquation();
            theory.invalidateTertiaryEquation();
            updateExponent();
        }
        a.maxLevel = 9;
    }
    // b
    {
        let getDesc = (level) => "b=" + (1+level);
        b = theory.createUpgrade(2, currency, new FreeCost());
        b.getDescription = (_) => Utils.getMath(getDesc(b.level));
        b.getInfo = (amount) => Utils.getMathTo(getDesc(b.level), getDesc(b.level + amount));
        b.boughtOrRefunded = (_) => {
            theory.invalidateSecondaryEquation();
            theory.invalidateTertiaryEquation();
            updateExponent();
        }
        b.maxLevel = 9;
    }
    //Realize
    {
        realize = theory.createPermanentUpgrade(0,currency, new FreeCost());
        realize.getDescription = (_) =>"Apply k Value"
        realize.getInfo = (_) =>"Reset t and Apply the k value to the Exponent of t"
        realize.bought = (_) =>{
            if(realExponent>=Exponent){
                kDecreaseP.show()
                return
            }
            realExponent = Exponent;
            realize.level = 0;
            theory.invalidatePrimaryEquation();
            t = BigNumber.from(0.01);
        }
    }
    t = BigNumber.from(0.01);
    realExponent=BigNumber.ZERO;
    maxLevel = 1;
    updateExponent();
}

function updateExponent(){
    let cValue = c.level+1;
    let aValue = a.level+1;
    let bValue = b.level+1;
    let exp = 0;
    for(i=1;i<=aValue;i++){
        for(j=1;j<=bValue;j++){
            exp+=1/Math.pow(1+i,j)*Math.sin(cValue*Math.pow(1+i,j))
        }
    }
    Exponent = BigNumber.from(exp*cValue/100);
}

var tick = (elapsedTime, multiplier) => {
    currency.value+=multiplier*elapsedTime*t.pow(realExponent);
    t += elapsedTime*multiplier;
    theory.invalidateTertiaryEquation();
}

var getInternalState = () => t.toBase64String() + " " + realExponent.toBase64String();

var setInternalState = (state) => {
    vars = state.split(" ")
    t=BigNumber.fromBase64String(vars[0]);
    realExponent=BigNumber.fromBase64String(vars[1]);
    updateExponent();
    theory.invalidatePrimaryEquation();
}

var getPrimaryEquation = () => {
    return "\\tau = \\rho_{max}^2\\ \\ \\ \\ \\dot{\\rho}=t^{"+realExponent.toString(6)+"}";
}

var getSecondaryEquation = () => "k=\\frac{c}{100}\\Sigma_{i=1}^a\\Sigma_{j=1}^b{\\frac{sin(c(1+i)^j)}{(1+i)^j}}";
theory.secondaryEquationHeight = 50;
theory.secondaryEquationScale = 1.2;
var getTertiaryEquation = () => "t="+t.toString(4) + "\\ " +"k="+Exponent.toString(6) + "\\ " + "\\dot{\\rho}=" + (t.pow(realExponent).toString(6));
var getTau = () => currency.value.pow(2);
var get2DGraphValue = () => currency.value.sign * (BigNumber.ONE + currency.value.abs()).log10().toNumber();

init();
