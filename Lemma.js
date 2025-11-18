import { ExponentialCost, FirstFreeCost, LinearCost } from "../api/Costs";
import { Localization } from "../api/Localization";
import { BigNumber, parseBigNumber } from "../api/BigNumber";
import { theory } from "../api/Theory";
import { Utils } from "../api/Utils";
import { CustomCost, FreeCost } from "../api/Costs/CustomCost";
import { QuaternaryEntry } from "./api/Theory";
import { TextAlignment } from "./api/ui/properties/TextAlignment";
import { Color } from "./api/ui/properties/Color";
import { ClearButtonVisibility } from "./api/ui/properties/ClearButtonVisibility";
import { ScrollBarVisibility } from "./api/ui/properties/ScrollBarVisibility";
import { ScrollOrientation } from "./api/ui/properties/ScrollOrientation";
import { LayoutOptions } from "./api/ui/properties/LayoutOptions";

var id = "convergence_test_speedrun";
var name = "Convergence Test (Speedrun)";
var description = "An speedrun-oriented implementation of the 'Convergence Test' theory from the game.";
var authors = "Gilles-Philippe Paillé, pacowoc";
var version = 2;

var c11, c12, c13;
var c21, c22, c23, c24;
var q31, q32, c31, c32, c33;
var c41, c42, c43;
var q51, q52, c51, c52, c53, c54, c55, c56, c57, c58;
var q61, q62, c61, c62, c63, c64;
var q71, q72, c71, c72;
var viewRecords;
var lemma;
var IlligalFlag = false;
const timeLimit = BigNumber.from(1e100);
const initialbestTime= [timeLimit, timeLimit, timeLimit, timeLimit, timeLimit, timeLimit, timeLimit];
var bestTime = Array.from(initialbestTime);
const lemmaCount = 7;
const provedLemmas = 7;
const initialQ = [BigNumber.ZERO, BigNumber.ONE, BigNumber.ZERO, BigNumber.ZERO, BigNumber.ZERO, BigNumber.ZERO, BigNumber.ZERO, BigNumber.ZERO];
var qs = Array.from(initialQ);
const initialT = [BigNumber.ZERO, BigNumber.ZERO, BigNumber.ZERO, BigNumber.ZERO, BigNumber.ZERO, BigNumber.ZERO, BigNumber.ZERO, BigNumber.ZERO];
var Ts = Array.from(initialT);
var currencyValues = [BigNumber.ZERO, BigNumber.ZERO, BigNumber.ZERO, BigNumber.ZERO, BigNumber.ZERO, BigNumber.ZERO, BigNumber.ZERO, BigNumber.ZERO];
var qDifferential = BigNumber.ZERO;
var quaternaryEntries = [];
var P = ui.createPopup({
    title: "Error",
    content: ui.createLabel({
        text: "An error occurred while loading the theory. Please restart the game.",
        horizontalTextAlignment: TextAlignment.CENTER,
    }),
    closeOnBackgroundClicked: false,
    isPeekable: true
})
class Purchase{
    variable;
    time;
    count;
    constructor(variable, time, count){
        this.variable = variable;
        this.time = time;
        this.count = count;
    }
    fromJSON(json){
        this.variable = json.variable;
        this.time = json.time;
        this.count = json.count;
    }
    toJSON(){
        return {
            variable: this.variable,
            time: this.time,
            count: this.count
        };
    }
}
class TaggedPurchase{
    tag;
    pur;
    constructor(tag, base){
        this.pur = base;
        this.tag = tag;
    }
}
var record = []
var lastRun = [[],[],[],[],[],[],[]]
var bestRun = [[],[],[],[],[],[],[]]
var importedRun = [[],[],[],[],[],[],[]]

const isRTL = Localization.isRTL;

var init = () => {
    currency = theory.createCurrency();
    

    ///////////////////
    // Permanent Upgrades


    viewRecords = theory.createPermanentUpgrade(0, currency, new FreeCost());
    viewRecords.getDescription = (_) => "View Purchase Records";
    viewRecords.getInfo = (_) => "View the purchase records in a popup window.";
    viewRecords.bought = (_) => {
        viewRecords.level = 0;
        let scrollarea = [];
        let title = [
            ui.createLabel({
                        horizontalTextAlignment: TextAlignment.CENTER,
                        column: 0,
                        row: 0,
                        text: "Active",
            }),
            ui.createLabel({
                        horizontalTextAlignment: TextAlignment.CENTER,
                        column: 1,
                        row: 0,
                        text: "Last"
            }),
            ui.createLabel({
                        horizontalTextAlignment: TextAlignment.CENTER,
                        column: 2,
                        row: 0,
                        text: "Best"
            }),
            ui.createLabel({
                        horizontalTextAlignment: TextAlignment.CENTER,
                        column: 3,
                        row: 0,
                        text: "Ref."
            }),
            ui.createLabel({
                        horizontalTextAlignment: TextAlignment.CENTER,
                        column: 0,
                        row: 1,
                        text: ()=>Ts[lemma.level].toString(1),
            }),
            ui.createLabel({
                        horizontalTextAlignment: TextAlignment.CENTER,
                        column: 1,
                        row: 1,
                        text: lastRun[lemma.level].length>0 ? lastRun[lemma.level].at(-1).time.toString(1): "==="
            }),
            ui.createLabel({
                        horizontalTextAlignment: TextAlignment.CENTER,
                        column: 2,
                        row: 1,
                        text: bestRun[lemma.level].length>0 ? bestRun[lemma.level].at(-1).time.toString(1): "==="
            }),
            ui.createLabel({
                        horizontalTextAlignment: TextAlignment.CENTER,
                        column: 3,
                        row: 1,
                        text: importedRun[lemma.level].length>0?importedRun[lemma.level].at(-1).time.toString(1): "==="
            })
        ];
        let cache = [];
        let recordTagged = record.map(entry => new TaggedPurchase(0,entry));
        let lastRunTagged = lastRun[lemma.level].map(entry => new TaggedPurchase(1,entry))
        let bestRunTagged = bestRun[lemma.level].map(entry => new TaggedPurchase(2,entry))
        let importedRunTagged = importedRun[lemma.level].map(entry => new TaggedPurchase(3,entry))
        let combinedLog = lastRunTagged.concat(bestRunTagged).concat(importedRunTagged).concat(recordTagged);
        let hasContent = [false,false,false,false];
        combinedLog.sort((a,b) => a.pur.time-b.pur.time);
        for (let i=0; i<combinedLog.length; i++){ 
            let entry = combinedLog[i].pur;
            let tag = combinedLog[i].tag;
            let lastEntry = i>0 ? combinedLog[i-1].pur : null;
            if ((lastEntry != null && entry.time==lastEntry.time && !hasContent[tag])||i==0){
                hasContent[tag]=true;
                cache.push(
                    ui.createLabel({
                        horizontalTextAlignment: TextAlignment.CENTER,
                        column: tag,
                        fontSize: 12,
                        textColor: entry.count > 0 ? Color.fromHex("#00FF00") : Color.fromHex("#ff0000"),
                        text: entry.variable + "(" + entry.count.toString() + ")@" + entry.time.toString(1)
                    })
                );
            }else{
                for(let i=0;i<4;i++){
                    if(!hasContent[i]){
                        cache.push(ui.createLabel({
                        horizontalTextAlignment: TextAlignment.CENTER,
                        column: i,
                        text: ""
                        }))
                    }
                }
                scrollarea.push(cache)
                cache = [];
                hasContent = [false,false,false,false];
                cache.push(
                    ui.createLabel({
                        horizontalTextAlignment: TextAlignment.CENTER,
                        column: tag,
                        fontSize: 12,
                        textColor: entry.count > 0 ? Color.fromHex("#00FF00") : Color.fromHex("#ff0000"),
                        text: entry.variable + "(" + entry.count.toString() + ")@" + entry.time.toString(1)
                    })
                )
            }
        }
        for(let i=0;i<4;i++){
                if(!hasContent[i]){
                    cache.push(ui.createLabel({
                    horizontalTextAlignment: TextAlignment.CENTER,
                    column: i,
                    text: ""
                    }))
                }
        }
        scrollarea.push(cache);
        let scrollareaChild = scrollarea.map((row)=>ui.createGrid({
            children: row
        }))
        P.title = "Purchase Comparison" + " (L" + (lemma.level+1).toString() + ")";
        P.content = ui.createStackLayout({
                        verticalOptions: LayoutOptions.START,
                        children: [
                            ui.createGrid({
                                children: title,
                                heightRequest:200
                            }),
                            ui.createScrollView({
                                content:ui.createStackLayout({
                                    children: scrollareaChild
                                }),
                                verticalScrollBarVisibility: ScrollBarVisibility.ALWAYS,
                                orientation: ScrollOrientation.VERTICAL,
                            })
                        ],
                        spacing:5
                    })
        P.show();

    }
    var importLegality = false;
    var importString = "";
    exportMenu = theory.createPermanentUpgrade(1, currency, new FreeCost());
    exportMenu.getDescription = (_) => "Export and Import";
    exportMenu.getInfo = (_) => "Opens a popup containing a string representing your runs, which can be copied to the clipboard.";
    exportMenu.bought = (_) => {
        exportMenu.level = 0;
        let exportString = JSON.stringify(lastRun[lemma.level],bigStringify);
        let exportStringBest = JSON.stringify(bestRun[lemma.level],bigStringify);
        P.title = "Export and Import" + " (L" + (lemma.level+1).toString() + ")";
        P.content = ui.createStackLayout({
            children:[
                ui.createLabel({
                    text: "String for Last Run: ",
                    horizontalTextAlignment: TextAlignment.CENTER,
                }),
                ui.createEntry({
                    text: exportString,
                    selectionLength:exportString.length,
                    cursorPosition:0,
                }),
                ui.createLabel({
                    text: "String for Best Run: ",
                    horizontalTextAlignment: TextAlignment.CENTER,
                }),
                ui.createEntry({
                    text: exportStringBest,
                    selectionLength:exportStringBest.length,
                    cursorPosition:0,
                }),
                ui.createLabel({
                    text: "Input field for external Recordings: ",
                    horizontalTextAlignment: TextAlignment.CENTER,
                }),
                ui.createEntry({
                    onTextChanged: (_, newTextValue) => {
                        try{
                            importString = newTextValue;
                            JSON.parse(newTextValue,unBigStringify);
                            importLegality = true;
                        }catch(e){
                            inputLegality = false;
                        }
                    }
                }),
                ui.createButton({
                    text: "Import",
                    backgroundColor: ()=> importLegality ? Color.DEFAULT : Color.DEACTIVATED_UPGRADE,
                    onClicked: () => {
                        if(importLegality) {
                            importedRun[lemma.level] = JSON.parse(importString,unBigStringify);
                            P.hide()
                        } 
                    }  
                })
            ]
        })
        P.show();
    }

    ///////////////////
    // Regular Upgrades

    // Lemma 1
    let baseId = 0;

    // c1
    {
        let getDesc = (level) => "c_1=" + getC11(level).toString(0);
        let getInfo = (level) => "c_1=" + getC11(level).toString(0);
        c11 = theory.createUpgrade(baseId + 0, currency, new FirstFreeCost(new ExponentialCost(10, Math.log2(1.5))));
        c11.getDescription = (amount) => Utils.getMath(getDesc(c11.level));
        c11.getInfo = (amount) => Utils.getMathTo(getInfo(c11.level), getInfo(c11.level + amount));
        c11.bought = (count) => {
            record.push(new Purchase('c1', Ts[0], count));;
        }
        c11.refunded = (count) => {
            record.push(new Purchase('c1', Ts[0], -count));
        }
    }

    // c2
    {
        let getDesc = (level) => "c_2=2^{" + level + "}";
        let getInfo = (level) => "c_2=" + getC12(level).toString(0);
        c12 = theory.createUpgrade(baseId + 1, currency, new ExponentialCost(30, Math.log2(3)));
        c12.getDescription = (amount) => Utils.getMath(getDesc(c12.level));
        c12.getInfo = (amount) => Utils.getMathTo(getInfo(c12.level), getInfo(c12.level + amount));
        c12.bought = (count) => {
            record.push(new Purchase('c2', Ts[0], count));
        }
        c12.refunded = (count) => {
            record.push(new Purchase('c2', Ts[0], -count));
        }
    }

    // c3
    {
        let getDesc = (level) => "c_3=2^{" + level + "}-1";
        let getInfo = (level) => "c_3=" + getC13(level).toString(0);
        c13 = theory.createUpgrade(baseId + 2, currency, new ExponentialCost(100, Math.log2(3)));
        c13.getDescription = (amount) => Utils.getMath(getDesc(c13.level));
        c13.getInfo = (amount) => Utils.getMathTo(getInfo(c13.level), getInfo(c13.level + amount));
        c13.bought = (count) => {
            record.push(new Purchase('c3', Ts[0], count));
        }
        c13.refunded = (count) => {
            record.push(new Purchase('c3', Ts[0], -count));
        }
    }

    // Lemma 2
    baseId += 100;

    // c1
    {
        let getDesc = (level) => "c_1=" + getC21(level).toString(0);
        let getInfo = (level) => "c_1=" + getC21(level).toString(0);
        c21 = theory.createUpgrade(baseId + 0, currency, new FirstFreeCost(new ExponentialCost(10, Math.log2(1.5))));
        c21.getDescription = (amount) => Utils.getMath(getDesc(c21.level));
        c21.getInfo = (amount) => Utils.getMathTo(getInfo(c21.level), getInfo(c21.level + amount));
        c21.boughtOrRefunded = (_) => theory.invalidateSecondaryEquation();
        c21.bought = (count) => {
            record.push(new Purchase('c1', Ts[1], count));
        }
        c21.refunded = (count) => {
            record.push(new Purchase('c1', Ts[1], -count));
        }
    }

    // c2
    {
        let getDesc = (level) => "c_2=2^{" + level + "}";
        let getInfo = (level) => "c_2=" + getC22(level).toString(0);
        c22 = theory.createUpgrade(baseId + 1, currency, new ExponentialCost(30, Math.log2(3)));
        c22.getDescription = (amount) => Utils.getMath(getDesc(c22.level));
        c22.getInfo = (amount) => Utils.getMathTo(getInfo(c22.level), getInfo(c22.level + amount));
        c22.boughtOrRefunded = (_) => theory.invalidateSecondaryEquation();
        c22.bought = (count) => {
            record.push(new Purchase('c2', Ts[1], count));
        }
        c22.refunded = (count) => {
            record.push(new Purchase('c2', Ts[1], -count));
        }
    }

    // c3
    {
        let getDesc = (level) => "c_3=" + getC23(level).toString(0);
        let getInfo = (level) => "c_3=" + getC23(level).toString(0);
        c23 = theory.createUpgrade(baseId + 2, currency, new ExponentialCost(200, Math.log2(1.3)));
        c23.getDescription = (amount) => Utils.getMath(getDesc(c23.level));
        c23.getInfo = (amount) => Utils.getMathTo(getInfo(c23.level), getInfo(c23.level + amount));
        c23.boughtOrRefunded = (_) => theory.invalidateSecondaryEquation();
        c23.bought = (count) => {
            record.push(new Purchase('c3', Ts[1], count));
        }
        c23.refunded = (count) => {
            record.push(new Purchase('c3', Ts[1], -count));
        }
    }

    // c4
    {
        let getDesc = (level) => "c_4=2^{" + level + "}";
        let getInfo = (level) => "c_4=" + getC24(level).toString(0);
        c24 = theory.createUpgrade(baseId + 3, currency, new ExponentialCost(250, Math.log2(2)));
        c24.getDescription = (amount) => Utils.getMath(getDesc(c24.level));
        c24.getInfo = (amount) => Utils.getMathTo(getInfo(c24.level), getInfo(c24.level + amount));
        c24.boughtOrRefunded = (_) => theory.invalidateSecondaryEquation();
        c24.bought = (count) => {
            record.push(new Purchase('c4', Ts[1], count));
        }
        c24.refunded = (count) => {
            record.push(new Purchase('c4', Ts[1], -count));
        }
    }

    // Lemma 3
    baseId += 100;

    // q1
    {
        let getDesc = (level) => "q_1=" + getQ31(level).toString(0);
        let getInfo = (level) => "q_1=" + getQ31(level).toString(0);
        q31 = theory.createUpgrade(baseId + 0, currency, new FirstFreeCost(new ExponentialCost(10, Math.log2(4))));
        q31.getDescription = (amount) => Utils.getMath(getDesc(q31.level));
        q31.getInfo = (amount) => Utils.getMathTo(getInfo(q31.level), getInfo(q31.level + amount));
        q31.bought = (count) => {
            record.push(new Purchase('q1', Ts[2], count));
        }
        q31.refunded = (count) => {
            record.push(new Purchase('q1', Ts[2], -count));
        }
    }

    // q2
    {
        let getDesc = (level) => "q_2=2^{" + level + "}";
        let getInfo = (level) => "q_2=" + getQ32(level).toString(0);
        q32 = theory.createUpgrade(baseId + 1, currency, new ExponentialCost(50, Math.log2(50)));
        q32.getDescription = (amount) => Utils.getMath(getDesc(q32.level));
        q32.getInfo = (amount) => Utils.getMathTo(getInfo(q32.level), getInfo(q32.level + amount));
        q32.bought = (count) => {
            record.push(new Purchase('q2', Ts[2], count));
        }
        q32.refunded = (count) => {
            record.push(new Purchase('q2', Ts[2], -count));
        }
    }

    // c1
    {
        let getDesc = (level) => "c_1=" + getC31(level).toString(0);
        let getInfo = (level) => "c_1=" + getC31(level).toString(0);
        c31 = theory.createUpgrade(baseId + 2, currency, new ExponentialCost(1e4, Math.log2(3)));
        c31.getDescription = (amount) => Utils.getMath(getDesc(c31.level));
        c31.getInfo = (amount) => Utils.getMathTo(getInfo(c31.level), getInfo(c31.level + amount));
        c31.bought = (count) => {
            record.push(new Purchase('c1', Ts[2], count));
        }
        c31.refunded = (count) => {
            record.push(new Purchase('c1', Ts[2], -count));
        }
    }

    // c2
    {
        let getDesc = (level) => "c_2=2^{" + level + "}";
        let getInfo = (level) => "c_2=" + getC32(level).toString(0);
        c32 = theory.createUpgrade(baseId + 3, currency, new ExponentialCost(1e5, Math.log2(2)));
        c32.getDescription = (amount) => Utils.getMath(getDesc(c32.level));
        c32.getInfo = (amount) => Utils.getMathTo(getInfo(c32.level), getInfo(c32.level + amount));
        c32.maxLevel = 25;
        c32.bought = (count) => {
            record.push(new Purchase('c2', Ts[2], count));
        }
        c32.refunded = (count) => {
            record.push(new Purchase('c2', Ts[2], -count));
        }
    }

    // c3
    {
        let getDesc = (level) => "c_3=2^{" + level + "}";
        let getInfo = (level) => "c_3=" + getC33(level).toString(0);
        c33 = theory.createUpgrade(baseId + 4, currency, new ExponentialCost(100, Math.log2(100)));
        c33.getDescription = (amount) => Utils.getMath(getDesc(c33.level));
        c33.getInfo = (amount) => Utils.getMathTo(getInfo(c33.level), getInfo(c33.level + amount));
        c33.bought = (count) => {
            record.push(new Purchase('c3', Ts[2], count));
        }
        c33.refunded = (count) => {
            record.push(new Purchase('c3', Ts[2], -count));
        }
    }

    // Lemma 4
    baseId += 100;

    // c1
    {
        let getDesc = (level) => "c_1=" + getC41(level).toString(0);
        let getInfo = (level) => "c_1=" + getC41(level).toString(0);
        c41 = theory.createUpgrade(baseId + 0, currency, new FirstFreeCost(new ExponentialCost(1, Math.log2(2.87))));
        c41.getDescription = (amount) => Utils.getMath(getDesc(c41.level));
        c41.getInfo = (amount) => Utils.getMathTo(getInfo(c41.level), getInfo(c41.level + amount));
        c41.bought = (count) => {
            record.push(new Purchase('c1', Ts[3], count));
        }
        c41.refunded = (count) => {
            record.push(new Purchase('c1', Ts[3], -count));
        }
    }

    // c2
    {
        let getDesc = (level) => "c_2=2^{" + level + "}";
        let getInfo = (level) => "c_2=" + getC42(level).toString(0);
        c42 = theory.createUpgrade(baseId + 1, currency, new ExponentialCost(5000, Math.log2(10)));
        c42.getDescription = (amount) => Utils.getMath(getDesc(c42.level));
        c42.getInfo = (amount) => Utils.getMathTo(getInfo(c42.level), getInfo(c42.level + amount));
        c42.bought = (count) => {
            record.push(new Purchase('c2', Ts[3], count));
        }
        c42.refunded = (count) => {
            record.push(new Purchase('c2', Ts[3], -count));
        }
    }

    // c3
    {
        let getDesc = (level) => "c_3=" + (level + 1) + "^2";
        let getInfo = (level) => "c_3=" + getC43(level).toString(0);
        c43 = theory.createUpgrade(baseId + 2, currency, new ExponentialCost(1, Math.log2(10)));
        c43.getDescription = (amount) => Utils.getMath(getDesc(c43.level));
        c43.getInfo = (amount) => Utils.getMathTo(getInfo(c43.level), getInfo(c43.level + amount));
        c43.bought = (count) => {
            record.push(new Purchase('c3', Ts[3], count));
        }
        c43.refunded = (count) => {
            record.push(new Purchase('c3', Ts[3], -count));
        }
    }

    // Lemma 5
    baseId += 100;

    // q1
    {
        let getDesc = (level) => "q_1=" + getQ51(level).toString(0);
        let getInfo = (level) => "q_1=" + getQ51(level).toString(0);
        q51 = theory.createUpgrade(baseId + 0, currency, new ExponentialCost(10, Math.log2(3)));
        q51.getDescription = (amount) => Utils.getMath(getDesc(q51.level));
        q51.getInfo = (amount) => Utils.getMathTo(getInfo(q51.level), getInfo(q51.level + amount));
        q51.bought = (count) => {
            record.push(new Purchase('q1', Ts[4], count));
        }
        q51.refunded = (count) => {
            record.push(new Purchase('q1', Ts[4], -count));
        }
    }

    // q2
    {
        let getDesc = (level) => "q_2=2^{" + level + "}";
        let getInfo = (level) => "q_2=" + getQ52(level).toString(0);
        q52 = theory.createUpgrade(baseId + 1, currency, new ExponentialCost(30, Math.log2(10)));
        q52.getDescription = (amount) => Utils.getMath(getDesc(q52.level));
        q52.getInfo = (amount) => Utils.getMathTo(getInfo(q52.level), getInfo(q52.level + amount));
        q52.bought = (count) => {
            record.push(new Purchase('q2', Ts[4], count));
        }
        q52.refunded = (count) => {
            record.push(new Purchase('q2', Ts[4], -count));
        }
    }

    // c1
    {
        let getDesc = (level) => "c_1=" + getC5i(level).toString(0);
        let getInfo = (level) => "c_1=" + getC5i(level).toString(0);
        c51 = theory.createUpgrade(baseId + 2, currency, new FreeCost());
        c51.getDescription = (amount) => Utils.getMath(getDesc(c51.level));
        c51.getInfo = (amount) => Utils.getMathTo(getInfo(c51.level), getInfo(c51.level + amount));
        c51.bought = (count) => {
            record.push(new Purchase('c1', Ts[4], count));
        }
        c51.refunded = (count) => {
            record.push(new Purchase('c1', Ts[4], -count));
        }
    }

    // c2
    {
        let getDesc = (level) => "c_2=" + getC5i(level).toString(0);
        let getInfo = (level) => "c_2=" + getC5i(level).toString(0);
        c52 = theory.createUpgrade(baseId + 3, currency, new ExponentialCost(1e6, Math.log2(1.1)));
        c52.getDescription = (amount) => Utils.getMath(getDesc(c52.level));
        c52.getInfo = (amount) => Utils.getMathTo(getInfo(c52.level), getInfo(c52.level + amount));
        c52.bought = (count) => {
            record.push(new Purchase('c2', Ts[4], count));
        }
        c52.refunded = (count) => {
            record.push(new Purchase('c2', Ts[4], -count));
        }
    }

    // c3
    {
        let getDesc = (level) => "c_3=" + getC5i(level).toString(0);
        let getInfo = (level) => "c_3=" + getC5i(level).toString(0);
        c53 = theory.createUpgrade(baseId + 4, currency, new ExponentialCost(1e11, Math.log2(1.1)));
        c53.getDescription = (amount) => Utils.getMath(getDesc(c53.level));
        c53.getInfo = (amount) => Utils.getMathTo(getInfo(c53.level), getInfo(c53.level + amount));
        c53.bought = (count) => {
            record.push(new Purchase('c3', Ts[4], count));
        }
        c53.refunded = (count) => {
            record.push(new Purchase('c3', Ts[4], -count));
        }
    }

    // c4
    {
        let getDesc = (level) => "c_4=" + getC5i(level).toString(0);
        let getInfo = (level) => "c_4=" + getC5i(level).toString(0);
        c54 = theory.createUpgrade(baseId + 5, currency, new ExponentialCost(1e13, Math.log2(1.1)));
        c54.getDescription = (amount) => Utils.getMath(getDesc(c54.level));
        c54.getInfo = (amount) => Utils.getMathTo(getInfo(c54.level), getInfo(c54.level + amount));
        c54.bought = (count) => {
            record.push(new Purchase('c4', Ts[4], count));
        }
        c54.refunded = (count) => {
            record.push(new Purchase('c4', Ts[4], -count));
        }
    }

    // c5
    {
        let getDesc = (level) => "c_5=" + getC5i(level).toString(0);
        let getInfo = (level) => "c_5=" + getC5i(level).toString(0);
        c55 = theory.createUpgrade(baseId + 6, currency, new ExponentialCost(1e15, Math.log2(1.08)));
        c55.getDescription = (amount) => Utils.getMath(getDesc(c55.level));
        c55.getInfo = (amount) => Utils.getMathTo(getInfo(c55.level), getInfo(c55.level + amount));
        c55.bought = (count) => {
            record.push(new Purchase('c5', Ts[4], count));
        }
        c55.refunded = (count) => {
            record.push(new Purchase('c5', Ts[4], -count));
        }
    }

    // c6
    {
        let getDesc = (level) => "c_6=" + getC5i(level).toString(0);
        let getInfo = (level) => "c_6=" + getC5i(level).toString(0);
        c56 = theory.createUpgrade(baseId + 7, currency, new ExponentialCost(1e17, Math.log2(1.06)));
        c56.getDescription = (amount) => Utils.getMath(getDesc(c56.level));
        c56.getInfo = (amount) => Utils.getMathTo(getInfo(c56.level), getInfo(c56.level + amount));
        c56.bought = (count) => {
            record.push(new Purchase('c6', Ts[4], count));
        }
        c56.refunded = (count) => {
            record.push(new Purchase('c6', Ts[4], -count));
        }
    }

    // c7
    {
        let getDesc = (level) => "c_7=" + getC5i(level).toString(0);
        let getInfo = (level) => "c_7=" + getC5i(level).toString(0);
        c57 = theory.createUpgrade(baseId + 8, currency, new ExponentialCost(1e19, Math.log2(1.02)));
        c57.getDescription = (amount) => Utils.getMath(getDesc(c57.level));
        c57.getInfo = (amount) => Utils.getMathTo(getInfo(c57.level), getInfo(c57.level + amount));
        c57.bought = (count) => {
            record.push(new Purchase('c7', Ts[4], count));
        }
        c57.refunded = (count) => {
            record.push(new Purchase('c7', Ts[4], -count));
        }
    }

    // c8
    {
        let getDesc = (level) => "c_8=" + getC5i(level).toString(0);
        let getInfo = (level) => "c_8=" + getC5i(level).toString(0);
        c58 = theory.createUpgrade(baseId + 9, currency, new ExponentialCost(1e21, Math.log2(1.01)));
        c58.getDescription = (amount) => Utils.getMath(getDesc(c58.level));
        c58.getInfo = (amount) => Utils.getMathTo(getInfo(c58.level), getInfo(c58.level + amount));
        c58.bought = (count) => {
            record.push(new Purchase('c8', Ts[4], count));
        }
        c58.refunded = (count) => {
            record.push(new Purchase('c8', Ts[4], -count));
        }
    }

    // Lemma 6
    baseId += 100;

    // q1
    {
        let getDesc = (level) => "q_1=" + getQ61(level).toString(0);
        let getInfo = (level) => "q_1=" + getQ61(level).toString(0);
        q61 = theory.createUpgrade(baseId + 0, currency, new ExponentialCost(10, Math.log2(5)));
        q61.getDescription = (amount) => Utils.getMath(getDesc(q61.level));
        q61.getInfo = (amount) => Utils.getMathTo(getInfo(q61.level), getInfo(q61.level + amount));
        q61.bought = (count) => {
            record.push(new Purchase('q1', Ts[5], count));
        }
        q61.refunded = (count) => {
            record.push(new Purchase('q1', Ts[5], -count));
        }
    }

    // q2
    {
        let getDesc = (level) => "q_2=2^{" + level + "}";
        let getInfo = (level) => "q_2=" + getQ62(level).toString(0);
        q62 = theory.createUpgrade(baseId + 1, currency, new ExponentialCost(100, Math.log2(10)));
        q62.getDescription = (amount) => Utils.getMath(getDesc(q62.level));
        q62.getInfo = (amount) => Utils.getMathTo(getInfo(q62.level), getInfo(q62.level + amount));
        q62.bought = (count) => {
            record.push(new Purchase('q2', Ts[5], count));
        }
        q62.refunded = (count) => {
            record.push(new Purchase('q2', Ts[5], -count));
        }
    }

    // c1
    {
        let getDesc = (level) => "c_1=" + getC61(level).toString(0);
        let getInfo = (level) => "c_1=" + getC61(level).toString(0);
        c61 = theory.createUpgrade(baseId + 2, currency, new FirstFreeCost(new ExponentialCost(30, Math.log2(10))));
        c61.getDescription = (amount) => Utils.getMath(getDesc(c61.level));
        c61.getInfo = (amount) => Utils.getMathTo(getInfo(c61.level), getInfo(c61.level + amount));
        c61.bought = (count) => {
            record.push(new Purchase('c1', Ts[5], count));
        }
        c61.refunded = (count) => {
            record.push(new Purchase('c1', Ts[5], -count));
        }
    }

    // c2
    {
        let getDesc = (level) => "c_2=" + getC62(level).toString(0);
        let getInfo = (level) => "c_2=" + getC62(level).toString(0);
        c62 = theory.createUpgrade(baseId + 3, currency, new FirstFreeCost(new ExponentialCost(30, Math.log2(10))));
        c62.getDescription = (amount) => Utils.getMath(getDesc(c62.level));
        c62.getInfo = (amount) => Utils.getMathTo(getInfo(c62.level), getInfo(c62.level + amount));
        c62.bought = (count) => {
            record.push(new Purchase('c2', Ts[5], count));
        }
        c62.refunded = (count) => {
            record.push(new Purchase('c2', Ts[5], -count));
        }
    }

    // c3
    {
        let getDesc = (level) => "c_3=" + level + "^{1/e}";
        let getInfo = (level) => "c_3=" + getC63(level).toString(4);
        c63 = theory.createUpgrade(baseId + 4, currency, new ExponentialCost(1e6, Math.log2(1.15)));
        c63.getDescription = (amount) => Utils.getMath(getDesc(c63.level));
        c63.getInfo = (amount) => Utils.getMathTo(getInfo(c63.level), getInfo(c63.level + amount));
        c63.refunded = (_) => { if (c63.level < 2) c63.Buy(2 - c63.level); }
        c63.canBeRefunded = (_) => c63.level > 2;
        c63.level = 2;
        c63.bought = (count) => {
            record.push(new Purchase('c3', Ts[5], count));
        }
        c63.refunded = (count) => {
            record.push(new Purchase('c3', Ts[5], -count));
        }
    }

    // c4
    {
        let getDesc = (level) => "c_4=" + level + "^{1/\\pi}";
        let getInfo = (level) => "c_4=" + getC64(level).toString(4);
        c64 = theory.createUpgrade(baseId + 5, currency, new ExponentialCost(1e6, Math.log2(1.15)));
        c64.getDescription = (amount) => Utils.getMath(getDesc(c64.level));
        c64.getInfo = (amount) => Utils.getMathTo(getInfo(c64.level), getInfo(c64.level + amount));
        c64.bought = (count) => {
            record.push(new Purchase('c4', Ts[5], count));
        }
        c64.refunded = (count) => {
            record.push(new Purchase('c4', Ts[5], -count));
        }
    }

    // Lemma 7
    baseId += 100;

    // q1
    {
        let getDesc = (level) => "q_1=" + getQ71(level).toString(0);
        let getInfo = (level) => "q_1=" + getQ71(level).toString(0);
        q71 = theory.createUpgrade(baseId + 0, currency, new FirstFreeCost(new ExponentialCost(10, Math.log2(1.5))));
        q71.getDescription = (amount) => Utils.getMath(getDesc(q71.level));
        q71.getInfo = (amount) => Utils.getMathTo(getInfo(q71.level), getInfo(q71.level + amount));
        q71.bought = (count) => {
            record.push(new Purchase('q1', Ts[6], count));
        }
        q71.refunded = (count) => {
            record.push(new Purchase('q1', Ts[6], -count));
        }
    }

    // q2
    {
        let getDesc = (level) => "q_2=2^{" + level + "}";
        let getInfo = (level) => "q_2=" + getQ72(level).toString(0);
        q72 = theory.createUpgrade(baseId + 1, currency, new ExponentialCost(30, Math.log2(10)));
        q72.getDescription = (amount) => Utils.getMath(getDesc(q72.level));
        q72.getInfo = (amount) => Utils.getMathTo(getInfo(q72.level), getInfo(q72.level + amount));
        q72.bought = (count) => {
            record.push(new Purchase('q2', Ts[6], count));
        }
        q72.refunded = (count) => {
            record.push(new Purchase('q2', Ts[6], -count));
        }
    }

    // c1
    {
        let getDesc = (level) => "c_1=" + getC71(level).toString(0);
        let getInfo = (level) => "c_1=" + getC71(level).toString(0);
        c71 = theory.createUpgrade(baseId + 2, currency, new ExponentialCost(10000, Math.log2(1.2)));
        c71.getDescription = (amount) => Utils.getMath(getDesc(c71.level));
        c71.getInfo = (amount) => Utils.getMathTo(getInfo(c71.level), getInfo(c71.level + amount));
        c71.bought = (count) => {
            record.push(new Purchase('c1', Ts[6], count));
        }
        c71.refunded = (count) => {
            record.push(new Purchase('c1', Ts[6], -count));
        }
    }

    // c2
    {
        let getDesc = (level) => "c_2=" + getC72(level).toString(0);
        let getInfo = (level) => "c_2=" + getC72(level).toString(0);
        c72 = theory.createUpgrade(baseId + 3, currency, new ExponentialCost(10000, Math.log2(1.5)));
        c72.getDescription = (amount) => Utils.getMath(getDesc(c72.level));
        c72.getInfo = (amount) => Utils.getMathTo(getInfo(c72.level), getInfo(c72.level + amount));
        c72.bought = (count) => {
            record.push(new Purchase('c2', Ts[6], count));
        }
        c72.refunded = (count) => {
            record.push(new Purchase('c2', Ts[6], -count));
        }
    }

    ///////////////////
    // Singular Upgrade
    let lemmaCost = new CustomCost((level) =>
    {
        var cost = 1e100;

        switch(level+1)
        {
            case 1: cost = 1e10; break;
            case 2: cost = 1e8; break;
            case 3: cost = 1e20; break;
            case 4: cost = 1.0001e10; break; // To compensate for numerical errors
            case 5: cost = 1e25; break;
            case 6: cost = 1e15; break;
            case 7: cost = 1e15; break;
        }

        return BigNumber.from(cost);
    });


    lemma = theory.createSingularUpgrade(0, currency, lemmaCost);
    lemma.maxLevel = lemmaCount;
    lemma.getDescription = (_) => Localization.getUpgradeProveLemma(Math.min(lemmaCount, lemma.level + 1));
    lemma.getInfo = (_) => Localization.getUpgradeProveLemma(Math.min(lemmaCount, lemma.level + 1));
    lemma.refunded = (_) => {
        if(IlligalFlag){
            theory.invalidatePrimaryEquation(); 
            theory.invalidateSecondaryEquation(); 
            theory.invalidateQuaternaryValues();
            resetStage();
            updateAvailability(); 
            onLemmaChanged();
            IlligalFlag=false;
        }
    }
    lemma.bought = (_)=>{
        if(!IlligalFlag){
            lemma.level-=1;
            record.push(new Purchase('Pf.', Ts[lemma.level], 1));
            lastRun[lemma.level]=record.slice(0);
            let oldtime = bestTime[lemma.level];
            bestTime[lemma.level] = bestTime[lemma.level].min(Ts[lemma.level]);
            P.title = "Attempt Summary";
            if(oldtime == timeLimit) {
                bestRun[lemma.level]=lastRun[lemma.level];
                P.content = ui.createStackLayout({
                    children: [
                        ui.createLabel({
                            text: "NEW RECORD!",
                            horizontalTextAlignment: TextAlignment.CENTER,
                            fontSize: 24,
                            textColor: Color.fromRgb(1,0.7,0),
                        }),
                        ui.createLabel({
                            text: "You have proven Lemma " + (lemma.level+1).toString() + " in " + Ts[lemma.level].toString(1) + " seconds, this is your first attempt.",
                        }),
                        ui.createLabel({
                            text: "Autosaved Purchase Sequence.",
                        })
                    ]
                })
            }
            else if(Ts[lemma.level]<oldtime) {
                bestRun[lemma.level]=lastRun[lemma.level];
                P.content = ui.createStackLayout({
                    children: [
                        ui.createLabel({
                            text: "NEW RECORD!",
                            horizontalTextAlignment: TextAlignment.CENTER,
                            fontSize: 24,
                            textColor: Color.fromRgb(1,0.7,0),
                        }),
                        ui.createLabel({
                            text: "You have proven Lemma " + (lemma.level+1).toString() + " in " + Ts[lemma.level].toString(1) + " seconds, this is a new record by " + (oldtime-Ts[lemma.level]).toString(1) + " seconds!",
                        }),
                        ui.createLabel({
                            text: "Autosaved Purchase Sequence.",
                        })
                    ]
                })
            }
            else if(Ts[lemma.level]==oldtime){
                bestRun[lemma.level]=lastRun[lemma.level];
                P.content = 
                        ui.createLabel({
                            text: "You have proven Lemma " + (lemma.level+1).toString()+ " in " + Ts[lemma.level].toString(1) + " seconds, this ties your old record. Keep going!",
                        }),
                        ui.createLabel({
                            text: "Autosaved Purchase Sequence.",
                        })
            }
            else{
                P.content = 
                        ui.createLabel({
                            text: "You have proven Lemma " + (lemma.level+1).toString() + " in " + Ts[lemma.level].toString(1) + " seconds, this misses your record by " + (Ts[lemma.level]-oldtime).toString(1) + " seconds!",
                        }),
                        ui.createLabel({
                            text: "Autosaved Purchase Sequence.",
                        })
            }
            P.show();
        }
        IlligalFlag = false;
        theory.invalidatePrimaryEquation(); 
        theory.invalidateSecondaryEquation(); 
        theory.invalidateQuaternaryValues();
        resetStage();
        updateAvailability(); 
        onLemmaChanged();
    }
}
var updateAvailability = () => {
    c11.isAvailable = lemma.level == 0;
    c12.isAvailable = lemma.level == 0;
    c13.isAvailable = lemma.level == 0;

    c21.isAvailable = lemma.level == 1;
    c22.isAvailable = lemma.level == 1;
    c23.isAvailable = lemma.level == 1;
    c24.isAvailable = lemma.level == 1;

    q31.isAvailable = lemma.level == 2;
    q32.isAvailable = lemma.level == 2;
    c31.isAvailable = lemma.level == 2;
    c32.isAvailable = lemma.level == 2;
    c33.isAvailable = lemma.level == 2;

    c41.isAvailable = lemma.level == 3;
    c42.isAvailable = lemma.level == 3;
    c43.isAvailable = lemma.level == 3;

    q51.isAvailable = lemma.level == 4;
    q52.isAvailable = lemma.level == 4;
    c51.isAvailable = lemma.level == 4;
    c52.isAvailable = lemma.level == 4;
    c53.isAvailable = lemma.level == 4;
    c54.isAvailable = lemma.level == 4;
    c55.isAvailable = lemma.level == 4;
    c56.isAvailable = lemma.level == 4;
    c57.isAvailable = lemma.level == 4;
    c58.isAvailable = lemma.level == 4;

    q61.isAvailable = lemma.level == 5;
    q62.isAvailable = lemma.level == 5;
    c61.isAvailable = lemma.level == 5;
    c62.isAvailable = lemma.level == 5;
    c63.isAvailable = lemma.level == 5;
    c64.isAvailable = lemma.level == 5;

    q71.isAvailable = lemma.level == 6;
    q72.isAvailable = lemma.level == 6;
    c71.isAvailable = lemma.level == 6;
    c72.isAvailable = lemma.level == 6;
}

var onLemmaChanged = () => {
    currency.value = currencyValues[lemma.level];
    theory.clearGraph();
}

var tick = (elapsedTime, multiplier) => {
    let dt = BigNumber.from(elapsedTime); // No multiplier. Everyone is equal.
    let lemmaNumber = lemma.level + 1;
    let isLemmaStarted = qs[lemma.level] > initialQ[lemma.level];

    switch(lemmaNumber)
    {
        case 1: isLemmaStarted |= c11.level > 0; break;
        case 2: isLemmaStarted |= c21.level > 0 || c23.level > 0; break;
        case 3: isLemmaStarted |= q31.level > 0; break;
        case 4: isLemmaStarted |= c41.level > 0; break;
        case 5: isLemmaStarted |= c51.level > 0 || c52.level > 0 || c53.level > 0 || c54.level > 0 ||
                                  c55.level > 0 || c56.level > 0 || c57.level > 0 || c58.level > 0; break;
        case 6: isLemmaStarted |= c61.level > 0 || q62.level > 0; break;
        case 7: isLemmaStarted |= q71.level > 0; break;
    }

    if (isLemmaStarted)
    {
        let q1q2 = BigNumber.ONE;

        switch(lemmaNumber)
        {
            case 3: q1q2 = getQ31(q31.level) * getQ32(q32.level); break;
            case 5: q1q2 = getQ51(q51.level) * getQ52(q52.level); break;
            case 6: q1q2 = getQ61(q61.level) * getQ62(q62.level); break;
            case 7: q1q2 = getQ71(q71.level) * getQ72(q72.level); break;
        }

        let dq = q1q2 * dt;
        let qt0 = qs[lemma.level];
        let qt1 = qt0 + dq;
        let q = qt1;
        Ts[lemma.level] += dt;
        qs[lemma.level] = q;

        if (lemmaNumber == 1)
        {
            let c1 = getC11(c11.level);
            let c2 = getC12(c12.level);
            let c3 = getC13(c13.level);
            currency.value += c1 * (dt * (BigNumber.HALF * c2 + c3) + c2 * (qt0.cos() - qt1.cos()));
        }
        else if (lemmaNumber == 2)
        {
            let c1 = getC21(c21.level);
            let c2 = getC22(c22.level);
            let c3 = getC23(c23.level);
            let c4 = getC24(c24.level);
            qDifferential = (c1 * c2 + c3 * c4) / q.pow(getQ2Exp());
            currency.value += dt * qDifferential;
        }
        else if (lemmaNumber == 3)
        {
            let c1 = getC31(c31.level);
            let c2 = getC32(c32.level);
            let c3 = getC33(c33.level);
            let twoExpC1 = BigNumber.TWO.pow(c1);
            if (c31.level % 2 == 1)
                twoExpC1 = -twoExpC1;
            currency.value += dt * (twoExpC1 * c2 + c3 * (qt0 + qt1) / BigNumber.TWO);
        }
        else if (lemmaNumber == 4)
        {
            let c1 = getC41(c41.level);
            let c2 = getC42(c42.level);
            let c3 = getC43(c43.level);
            qDifferential = c1 * c2 * (c3 * q - q.square() / BigNumber.FIVE);
            currency.value += dt * qDifferential;
        }
        else if (lemmaNumber == 5)
        {
            let bc1 = BigNumber.from(c51.level).pow(BigNumber.FOUR) * (2 * 1 - c51.level);
            let bc2 = BigNumber.from(c52.level).pow(BigNumber.FOUR) * (2 * 4 - c52.level);
            let bc3 = BigNumber.from(c53.level).pow(BigNumber.FOUR) * (2 * 9 - c53.level);
            let bc4 = BigNumber.from(c54.level).pow(BigNumber.FOUR) * (2 * 16 - c54.level);
            let bc5 = BigNumber.from(c55.level).pow(BigNumber.FOUR) * (2 * 25 - c55.level);
            let bc6 = BigNumber.from(c56.level).pow(BigNumber.FOUR) * (2 * 36 - c56.level);
            let bc7 = BigNumber.from(c57.level).pow(BigNumber.FOUR) * (2 * 49 - c57.level);
            let bc8 = BigNumber.from(c58.level).pow(BigNumber.FOUR) * (2 * 64 - c58.level);
            let t1 = bc1 * q;
            let t2 = bc2 * q;
            let t3 = bc3 * q;
            let t4 = bc4 * q;
            let t5 = bc5 * q;
            let t6 = bc6 * q;
            let t7 = bc7 * q;
            let t8 = bc8 * q;
            qDifferential = (t1 + t2 + t3 + t4 + t5 + t6 + t7 + t8);
            currency.value += dt * qDifferential;
        }
        else if (lemmaNumber == 6)
        {
            let c1 = getC61(c61.level);
            let c2 = getC62(c62.level);
            let c3 = getC63(c63.level);
            let c4 = getC64(c64.level);
            let factor = (c1 - c2) / (c3 - c4);
            currency.value += dt * factor * (qt0 + qt1) / BigNumber.TWO;
        }
        else if (lemmaNumber == 7)
        {
            let c1 = getC71(c71.level);
            let c2 = getC72(c72.level);
            let factor = BigNumber.ONE / (BigNumber.E - c1 / c2).abs();
            currency.value += dt * factor * (qt0 + qt1) / BigNumber.TWO;
        }
    }

    currencyValues[lemma.level] = currency.value;
    theory.invalidateTertiaryEquation();
    theory.invalidatePrimaryEquation();
    theory.invalidateQuaternaryValues();
}

let bigStringify = (_, val) => {
    try {
        if (val instanceof BigNumber)
            return 'BigNumber' + val.toBase64String();
    }
    catch { }
    ;
    return val;
};
let unBigStringify = (_, val) => {
    if (val && typeof val === 'string') {
        if (val.startsWith('BigNumber'))
            return BigNumber.fromBase64String(val.substring(9));
    }
    return val;
};


var getInternalState = () => {
    var result =version.toString();

    for (let i = 0; i < lemmaCount; ++i)
        result += " " + qs[i].toString() + " " + currencyValues[i].toString() + " " + bestTime[i].toString() + " " + Ts[i].toString();
    result +="~" + JSON.stringify(lastRun,bigStringify) + "~" + JSON.stringify(bestRun,bigStringify) + "~" + JSON.stringify(importedRun,bigStringify) + "~" + JSON.stringify(record,bigStringify);
    return result;
}


var setInternalState = (state) => {
    let terms = state.split("~")
    let values = terms[0].split(" ");
    if(terms.length>1&&values[0]>1){
        lastRun = JSON.parse(terms[1],unBigStringify);
        bestRun = JSON.parse(terms[2],unBigStringify);
        importedRun = JSON.parse(terms[3],unBigStringify);
        record = JSON.parse(terms[4],unBigStringify);
    }

    for (let i = 0; i < lemmaCount; ++i)
    {
        if (values.length > 4*i + 1) qs[i] = parseBigNumber(values[4*i+1]);
        if (values.length > 4*i + 2) currencyValues[i] = parseBigNumber(values[4*i+2]);
        if (values.length > 4*i + 3) bestTime[i] = parseBigNumber(values[4*i + 3]);
        if (values.length > 4*i + 4) Ts[i] = parseBigNumber(values[4*i + 4]);
    }
}

var isCurrencyVisible = (index) => lemma.level < lemmaCount;
var alwaysShowRefundButtons = () => true;

var getPrimaryEquation = () => {
    theory.primaryEquationHeight = 50;
    theory.primaryEquationScale = 2;
    if(lemma.level!=7)return "L"+(lemma.level+1).toString() +":" + Ts[lemma.level].toString(1) + "\\;" + "\\text{s}";
    else if(bestTime.reduce((a, b) => a + b, BigNumber.ZERO)>=timeLimit) return "Unfinished";
    else return "Total:" + bestTime.reduce((a, b) => a + b, BigNumber.ZERO).toString(1) + "\\;" + "\\text{s}";
}

var getSecondaryEquation = () => {
    theory.secondaryEquationHeight = 55;
        let result = "";
        let lemmaNumber = lemma.level + 1;
    
        if (lemmaNumber == 1)
        {
            result += "\\begin{matrix}";
            result += "\\dot{\\rho}=c_1\\left(c_2(\\sin\\left(q\\right)+\\frac{1}{2})+c_3\\right)";
            result += "\\\\";
            result += "\\dot{q}=1";
            result += "\\end{matrix}";
        }
        else if (lemmaNumber == 2)
        {
            result += "\\begin{matrix}";
            result += "\\dot{\\rho}=(c_1c_2 + c_3c_4)/q^{";
            result += getQ2Exp().toString(2);
            result += "}\\\\";
            result += "\\dot{q}=1";
            result += "\\end{matrix}";
        }
        else if (lemmaNumber == 3)
        {
            result += "\\begin{matrix}";
            result += "\\dot{\\rho}=(-2)^{c_1}c_2 + c_3q";
            result += "\\\\";
            result += "\\dot{q}=q_1q_2";
            result += "\\end{matrix}";
        }
        else if (lemmaNumber == 4)
        {
            result += "\\begin{matrix}";
            result += "\\dot{\\rho}=c_1c_2(c_3q - q^2/5)";
            result += "\\\\";
            result += "\\dot{q}=1";
            result += "\\end{matrix}";
        }
        else if (lemmaNumber == 5)
        {
            result += "\\begin{matrix}";
            result += "\\dot{\\rho}=\\sum_{i=1}^8 c_i^4(2i^2-c_i) q";
            result += "\\\\";
            result += "\\dot{q}=q_1q_2";
            result += "\\end{matrix}";
        }
        else if (lemmaNumber == 6)
        {
            result += "\\begin{matrix}";
            result += "\\dot{\\rho}=q(c_1 - c_2)/(c_3 - c_4)";
            result += "\\\\";
            result += "\\dot{q}=q_1q_2";
            result += "\\end{matrix}";
        }
        else if (lemmaNumber == 7)
        {
            result += "\\begin{matrix}";
            result += "\\dot{\\rho}=q/|e - c_1/c_2|";
            result += "\\\\";
            result += "\\dot{q}=q_1q_2";
            result += "\\end{matrix}";
        }
    
        if (lemma.level == lemmaCount)
        {
            result += "\\text{";
            result += Localization.getConvergenceTestQED();
            result += "}";
        }
    
        return result;
}

var getTertiaryEquation = () => {
    if (lemma.level == lemmaCount)
        return "";

    let result = "";
    
    let q = qs[lemma.level];
    result += "q=";
    result += q.toString();

    let lemmaNumber = lemma.level + 1;

    if (lemmaNumber == 2)
    {
        result += ",\\; q^{";
        var qExp = getQ2Exp();
        result += qExp.toString(2);
        result += "}=";
        result += (q.pow(qExp)).toString(2);
        result += ",\\; \\dot{\\rho}=";
        result += qDifferential.toString(2);
    }
    if (lemmaNumber == 4 || lemmaNumber == 5)
    {
        result += ",\\; \\dot{\\rho}=";
        result += qDifferential.toString(2);
    }
    if (lemmaNumber == 6)
    {
        var c3 = getC63(c63.level);
        var c4 = getC64(c64.level);
        var c3mc4 = c3 - c4;
        result += ",\\; c_3-c_4=";
        result += c3mc4.toNumber().toFixed(8);
    }
    else if (lemmaNumber == 7)
    {
        var c1 = getC71(c71.level);
        var c2 = getC72(c72.level);
        result += ",\\; c_1/c_2=";
        result += (c1/c2).toNumber().toFixed(8);
    }

    return result;
}

var getCompletion = () => Math.min(100, Math.round((100.0 * provedLemmas) / lemmaCount));
var get2DGraphValue = () => currency.value.sign * (BigNumber.ONE + currency.value.abs()).log10().toNumber();

var getC11 = (level) => Utils.getStepwisePowerSum(level, 2, 10, 0);
var getC12 = (level) => BigNumber.TWO.pow(level);
var getC13 = (level) => BigNumber.TWO.pow(level) - BigNumber.ONE;

var getC21 = (level) => Utils.getStepwisePowerSum(level, 2, 10, 0);
var getC22 = (level) => BigNumber.TWO.pow(level);
var getC23 = (level) => Utils.getStepwisePowerSum(level, 2, 10, 0);
var getC24 = (level) => BigNumber.TWO.pow(level);
var getQ2Exp = () => BigNumber.from((c21.level + c22.level + c23.level + c24.level) / 100.0);

var getQ31 = (level) => Utils.getStepwisePowerSum(level, 2, 10, 0);
var getQ32 = (level) => BigNumber.TWO.pow(level);
var getC31 = (level) => BigNumber.from(level);
var getC32 = (level) => BigNumber.TWO.pow(level);
var getC33 = (level) => BigNumber.TWO.pow(level);

var getC41 = (level) => Utils.getStepwisePowerSum(level, 2, 10, 0);
var getC42 = (level) => BigNumber.TWO.pow(level);
var getC43 = (level) => BigNumber.from(level + 1).square();

var getQ51 = (level) => Utils.getStepwisePowerSum(level, 2, 10, 1);
var getQ52 = (level) => BigNumber.TWO.pow(level);
var getC5i = (level) => BigNumber.from(level);

var getQ61 = (level) => Utils.getStepwisePowerSum(level, 2, 10, 1);
var getQ62 = (level) => BigNumber.TWO.pow(level);
var getC61 = (level) => Utils.getStepwisePowerSum(level, 2, 10, 0);
var getC62 = (level) => Utils.getStepwisePowerSum(level, 2, 10, 0);
var getC63 = (level) => BigNumber.from(level).pow(BigNumber.ONE / BigNumber.E);
var getC64 = (level) => BigNumber.from(level).pow(BigNumber.ONE / BigNumber.PI);

var getQ71 = (level) => Utils.getStepwisePowerSum(level, 2, 10, 0);
var getQ72 = (level) => BigNumber.TWO.pow(level);
var getC71 = (level) => BigNumber.from(level) + 1;
var getC72 = (level) => BigNumber.from(level) + 1;

var getResetStageMessage = () => Localization.get("TheoryResetConvergenceTest");
var canResetStage = () => true;
var resetStage = () => {
    switch (lemma.level + 1)
    {
        case 1:
            c11.level = 0;
            c12.level = 0;
            c13.level = 0;
            break;
        case 2:
            c21.level = 0;
            c22.level = 0;
            c23.level = 0;
            c24.level = 0;
            break;
        case 3:
            q31.level = 0;
            q32.level = 0;
            c31.level = 0;
            c32.level = 0;
            c33.level = 0;
            break;
        case 4:
            c41.level = 0;
            c42.level = 0;
            c43.level = 0;
            break;
        case 5:
            q51.level = 0;
            q52.level = 0;
            c51.level = 0;
            c52.level = 0;
            c53.level = 0;
            c54.level = 0;
            c55.level = 0;
            c56.level = 0;
            c57.level = 0;
            c58.level = 0;
            break;
        case 6:
            q61.level = 0;
            q62.level = 0;
            c61.level = 0;
            c62.level = 0;
            c63.level = 2;
            c64.level = 0;
            break;
        case 7:
            q71.level = 0;
            q72.level = 0;
            c71.level = 0;
            c72.level = 0;
            break;
    }
    record= [];
    currency.value = BigNumber.ZERO;
    currencyValues[lemma.level] = BigNumber.ZERO;
    qs[lemma.level] = initialQ[lemma.level];
    Ts[lemma.level] = initialT[lemma.level];
    qDifferential = BigNumber.ZERO;
    theory.clearGraph();
}


var getQuaternaryEntries = () => {
    if (quaternaryEntries.length == 0)
    {
        quaternaryEntries.push(new QuaternaryEntry("L_1", null));
        quaternaryEntries.push(new QuaternaryEntry("L_2", null));
        quaternaryEntries.push(new QuaternaryEntry("L_3", null));
        quaternaryEntries.push(new QuaternaryEntry("L_4", null));
        quaternaryEntries.push(new QuaternaryEntry("L_5", null));
        quaternaryEntries.push(new QuaternaryEntry("L_6", null));
        quaternaryEntries.push(new QuaternaryEntry("L_7", null));
    }
    for(let i = 0; i < lemmaCount; ++i){
        if(bestTime[i]<timeLimit){
            if(i==lemma.level){
                if(Ts[i]<bestTime[i]){
                    quaternaryEntries[i].value = bestTime[i].toString(1) +"s  (" + (Ts[i]-bestTime[i]).toString(1) + ")";
                }else{
                    quaternaryEntries[i].value = bestTime[i].toString(1) +"s  (+" + (Ts[i]-bestTime[i]).toString(1) + ")";
                }
            }
            else  quaternaryEntries[i].value = bestTime[i].toString(1) + "s";
        }
        else{
            quaternaryEntries[i].value = "---";
        }
    }
    return quaternaryEntries;
}


var canGoToPreviousStage = () => Ts[lemma.level] == 0 && lemma.level!=0;
var goToPreviousStage = () =>{
    IlligalFlag = true;
    if(lemma.level!=0)lemma.level -= 1;
};
var canGoToNextStage = () => Ts[lemma.level] == 0 && lemma.level!=lemmaCount;
var goToNextStage = () =>{
    IlligalFlag = true;
    if(lemma.level!=lemmaCount) lemma.level += 1
};

init();
