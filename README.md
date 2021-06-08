# Alexa Skill Test Driver
(後半に日本語の説明あり)

The Alexa Skill Test Driver (ASTD) supports the automation of Alexa conversation 
testing for the Alexa custom skill development.

ASTD uses Alexa Skill Management API (SMAPI) to invoke a Skill via Alexa service, 
and validates the response from the Skill.
ASTD can test both single-turn and multiple-turn 
conversations with voice and card interfaces.
However, ASTD does not support the Alexa Presentation Language (APL) interface.

Test data consumed by ASTD are structured as follows:

Test Data -> Test Case -> Test Turn

Test Turn represents a conversation of a single turn between a user and a Skill.
A turn is initiated by the user with an utterance and the Skill responds 
to it via Alexa service.
You can specify the input text (utterance) and expected outputs from the Skill in the test data.
The expected outputs may include the following:

* outputSpeech (voice)
* card
* reprompt
* shouldEndSession

Test Case represents a session between a user and a Skill which likely includes multiple turns.

Test Data can have multiple Test Cases.

ASTD is designed to be run by Mocha, so that you need to provide 
your test data as JavaScript or TypeScript code. 
However you do not need to write validation codes by yourself.
You just need to define the input utterance and the expected output to/from a Skill.

The following is an example of a test code for Hello World skill (a sample skill provided by Amazon).

```typescript

import * as Astd from 'alexa-skill-test-driver';
import * as config from './config.json';

const testData: Astd.TestData = {
    title: 'Test Hello World',
    locale: 'en-US',
    testCases: [
        {
            title: 'Open Skill and Say Hello',
            turns: [
                {
                    input: {
                        speak: 'Open hello world',
                        mode: 'FORCE_NEW_SESSION'
                    },
                    output: {
                        outputSpeech: {
                            type: 'SSML',
                            ssml: 'Welcome, you can say Hello or Help. Which would you like to try?'
                        },
                        reprompt: {
                            type: 'SSML',
                            ssml: 'Welcome, you can say Hello or Help. Which would you like to try?'
                        },
                        shouldEndSession: false
                    }
                },
                {
                    input: {
                        speak: 'hello'
                    },
                    output: {
                        outputSpeech: {
                            type: 'SSML',
                            ssml: 'Hello World!'
                        }
                    }
                }
            ]
        },
        {
            title: 'Open Skill and Say Help',
            turns: [
                {
                    input: {
                        speak: 'Open hello world',
                        mode: 'FORCE_NEW_SESSION'
                    },
                    output: {
                        outputSpeech: {
                            type: 'SSML',
                            ssml: 'Welcome, you can say Hello or Help. Which would you like to try?'
                        },
                        reprompt: {
                            type: 'SSML',
                            ssml: 'Welcome, you can say Hello or Help. Which would you like to try?'
                        },
                        shouldEndSession: false
                    }
                },
                {
                    input: {
                        speak: 'help'
                    },
                    output: {
                        outputSpeech: {
                            type: 'SSML',
                            ssml: 'You can say hello to me! How can I help?'
                        },
                        reprompt: {
                            type: 'SSML',
                            ssml: 'You can say hello to me! How can I help?'
                        },
                        shouldEndSession: false
                    }
                }
            ]
        }
    ]
};

(async () => await Astd.executeTestData(testData, config))();
```
config.json should have the following tags:

```json
{
    "skill_id": "",
    "client_id": "",
    "client_secret": "",
    "refresh_token": ""
}
```

* skill_id - obtained from the Alexa Developer Console
* client_id - obtained from LWA (Login with Amazon)
* client_secret - obtained from LWA
* refresh_token - obtained from ASK CLI

The following is the output from the test execution.
```
> hello-world@1.2.0 test
> mocha --timeout 15000 --slow 3000



  Test Hello World
    File: test-hello-world
      TC: Open Skill and Say Hello     
        Turn: 1
          .............................
          ... U: Open hello world      
          ... A: Welcome, you can say Hello or Help. Which would you like to try?
          .............................
          √ Validating Turn 1 (3681ms)
        Turn: 2
          .............................
          ... U: hello
          ... A: Hello World!
          .............................
          √ Validating Turn 2 (2881ms) 
      TC: Open Skill and Say Help      
        Turn: 1
          .............................
          ... U: Open hello world      
          ... A: Welcome, you can say Hello or Help. Which would you like to try?
          .............................
          √ Validating Turn 1 (2908ms)
        Turn: 2
          .............................
          ... U: help
          ... A: You can say hello to me! How can I help?
          .............................
          √ Validating Turn 2 (2882ms)


  4 passing (12s)
```

You can find the test data in the following Git repositry:

https://github.com/chandora/samples-alexa-skill-hello-world

See the change history at the bottom.

# Alexa Skill Test Driver

Alexa Skill Test Driver (ASTD)は、Alexaのスキル開発において、スキルとの対話テストの自動化を支援します。

ASTDはAlexa Skill Management API (SMAPI)を使って、
スキルを呼び出し、そのレスポンスを検証します。
ASTDは、シングルターン、マルチターンの会話をテストできます。
検証対象には、音声およびカードのインタフェースが含まれますが、
APLによるインタフェースは含まれません。

ASTDの使用するテストデータは下記のような構造を持ちます。

Test Data -> Test Case -> Test Turn

Test Turnは、会話の1つのターン（やりとり）に相当します。
ターンは、ユーザーが発話することで開始され、
それに対してスキルからレスポンスが返されます。
テストデータには、ユーザーの発話と、期待されるスキルからの
レスポンスの内容を指定します。

レスポンスには下記の項目が含まれます。

* outputSpeech (音声)
* card
* reprompt
* shouldEndSession

Test Caseは、ユーザーとスキルの間の、一連のやり取りを表します。
多くの場合、複数のターンから構成されます。

Test Dataは、複数のTest Caseを束ねることができます。

ASTDは、Mochaによって実行されます。
このためテストデータは、JavaScriptまたはTypeScriptで
記述する必要があります。

ただし、検証のためのコードは書く必要はありません。
必要なのは、スキルへのインプットとなる発話と期待されるスキルからのアウトプットの定義です。

Amazonの提供するサンプルスキルであるHello Worldスキルに対応した、
テストコードとテスト結果ののサンプルを示します。(上方にある英語版の説明に含まれています)

このコードの中では、config.jsonというファイルにアクセスして、
構成情報を取得しています。
config.jsonには下記の項目が含まれています。

* skill_id - Alexa開発者コンソールから取得します
* client_id - LWA (Login with Alexa)から取得します
* client_secret - LWAから取得します
* refresh_token - ASK CLIから取得します

テストデータは下記のGitレポジトリにあります。

https://github.com/chandora/samples-alexa-skill-hello-world


## Change History:

* 1.0.0 - Inital Release
* 0.5.1 - Change the class name TestGroup to TestData for better consistency
* 0.4.14 - Add some options to execute
* 0.4.13 - Documentation Update
* 0.4.12 - Documentation Update / Refactoring
* 0.4.11 - Improve output format / Apply bail to each test case instead of test group
* 0.4.10 - Improve output format
* 0.4.9 - Add print to format output messages
* 0.4.8 - Fix bug 
* 0.4.7 - Fix bug 
* 0.4.6 - Add pre/post processors at TestCase level
* 0.4.5 - Add file name to the output (in de)
* 0.4.4 - Terminate the rest of turns if failed
* 0.4.3 - Add an option to dump a response from the SMAPI call
* 0.4.2 - Add error messages and fix typo in the sample test code
* 0.4.1 - Change the interface of "Astd.executeTestGroup()"
* 0.3.11 - Documentation Update
* 0.3.10 - Documentation Update
* 0.3.9 - Documentation