const http = require('http');
const $ = require('jquery');

http.createServer((req, res) => {
  console.log(req.headers);
  res.writeHead(200, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'});
  res.end('Hello World\n');
}).listen(1337);

console.log('Server running at http://localhost:1337/');


///nagai
const APIAI_CLIENT_ACCESS_TOKEN = '507fa7521a514e4098d4e309f5f42502';

// -----------------------------------------------------------------------------
// モジュールのインポート
var express = require('express');
var bodyParser = require('body-parser');
var mecab = require('mecabaas-client');
var shokuhin = require('shokuhin-db');
var memory = require('memory-cache');
var apiai = require('apiai'); // 追加
var uuid = require('node-uuid'); // 追加
var Promise = require('bluebird'); // 追加
var dietitian = require('./dietitian');
var app = express();

// -----------------------------------------------------------------------------
// ミドルウェア設定

// リクエストのbodyをJSONとしてパースし、req.bodyからそのデータにアクセス可能にします。
app.use(bodyParser.json());

// 追加：Promiseチェーンのキャンセルを有効にします。
Promise.config({
    cancellation: true
});

app.post('/webhook', function(req, res, next){
    res.status(200).end();
    for (var event of req.body.events){
        if (event.type == 'message' && event.message.text){

            /*
             * api.aiでメッセージを処理。レスポンスとしてgotIntentというPromiseを返すように実装。
             */
            var aiInstance = apiai(APIAI_CLIENT_ACCESS_TOKEN, {language:'ja'});
            var aiRequest = aiInstance.textRequest(event.message.text, {sessionId: uuid.v1()});
            var gotIntent = new Promise(function(resolve, reject){
                aiRequest.on('response', function(response){
                    resolve(response);
                });
                aiRequest.end();
            });

            /*
             * api.aiからレスポンスが帰ってきたらこの処理を開始。
             */
            var main = gotIntent.then(
                function(response){
                    console.log(response.result.action);
                    switch (response.result.action) {
                        case 'recommendation':
                            // 意図は「お薦めの食事」だと特定。お薦めの食事を回答します。
                            dietitian.replyRecommendation(event.replyToken);

                            // ここで処理は終了
                            main.cancel();
                            break;
                        default:
                            // 意図が特定されなかった場合は食事の報告だと仮定して形態素解析処理へ移る。
                            return mecab.parse(event.message.text);
                            break;
                    }
                }
            ).then(
                function(response){
                    var foodList = [];
                    for (var elem of response){
                        if (elem.length > 2 && elem[1] == '名詞'){
                            foodList.push(elem);
                        }
                    }
                    var gotAllNutrition = [];
                    if (foodList.length > 0){
                        for (var food of foodList){
                            gotAllNutrition.push(shokuhin.getNutrition(food[0]));
                        }
                        return Promise.all(gotAllNutrition);
                    }
                }
            ).then(
                function(responseList){
                    var botMemory = {
                        confirmedFoodList: [],
                        toConfirmFoodList: [],
                        confirmingFood: null
                    }
                    for (var nutritionList of responseList){
                        if (nutritionList.length == 0){
                            // 少なくとも今回の食品DBでは食品と判断されなかったのでスキップ。
                            continue;
                        } else if (nutritionList.length == 1){
                            // 該当する食品が一つだけ見つかったのでこれで確定した食品リストに入れる。
                            botMemory.confirmedFoodList.push(nutritionList[0]);
                        } else if (nutritionList.length > 1){
                            // 複数の該当食品が見つかったのでユーザーに確認するリストに入れる。
                            botMemory.toConfirmFoodList.push(nutritionList);
                        }
                    }

                    /*
                     * もし確認事項がなければ、合計カロリーを返信して終了。
                     * もし確認すべき食品があれば、質問して現在までの状態を記憶に保存。
                     */
                    if (botMemory.toConfirmFoodList.length == 0 && botMemory.confirmedFoodList.length > 0){
                        // 確認事項はないので、確定した食品のカロリーの合計を返信して終了。
                        dietitian.replyTotalCalorie(event.replyToken, botMemory.confirmedFoodList);
                    } else if (botMemory.toConfirmFoodList.length > 0){
                        // どの食品が正しいか確認する。
                        dietitian.askWhichFood(event.replyToken, botMemory.toConfirmFoodList[0]);

                        // 質問した食品は確認中のリストに入れ、質問リストからは削除。
                        botMemory.confirmingFood = botMemory.toConfirmFoodList[0];
                        botMemory.toConfirmFoodList.splice(0, 1);

                        // Botの記憶に保存
                        memory.put(event.source.userId, botMemory);
                    }
                }
            );
        } else if (event.type == 'postback'){
            // リクエストからデータを抽出。
            var answeredFood = JSON.parse(event.postback.data);

            // 記憶を取り出す。
            var botMemory = memory.get(event.source.userId);

            // 回答された食品を確定リストに追加
            botMemory.confirmedFoodList.push(answeredFood);

            /*
             * もし確認事項がなければ、合計カロリーを返信して終了。
             * もし確認すべき食品があれば、質問して現在までの状態を記憶に保存。
             */
            if (botMemory.toConfirmFoodList.length == 0 && botMemory.confirmedFoodList.length > 0){
                // 確認事項はないので、確定した食品のカロリーの合計を返信して終了。
                dietitian.replyTotalCalorie(event.replyToken, botMemory.confirmedFoodList);
            } else if (botMemory.toConfirmFoodList.length > 0){
                // どの食品が正しいか確認する。
                dietitian.askWhichFood(event.replyToken, botMemory.toConfirmFoodList[0]);

                // 質問した食品は確認中のリストに入れ、質問リストからは削除。
                botMemory.confirmingFood = botMemory.toConfirmFoodList[0];
                botMemory.toConfirmFoodList.splice(0, 1);

                // Botの記憶に保存
                memory.put(event.source.userId, botMemory);
            }
        }
    }
});