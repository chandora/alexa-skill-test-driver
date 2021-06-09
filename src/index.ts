/**
 * Alexa Skill Test Driver
 * 
 * Copyright (C) 2021, KAWAMURA Tateo, All Rights Reserved.
 * 
 */
'strict'
import * as Model from 'ask-sdk-model';
import * as Smapi from 'ask-smapi-sdk';
import * as SmModel from 'ask-smapi-model';
import * as Path from 'path';
import { services } from 'ask-smapi-model';
import { assert } from 'chai';

const MaxRetryForSimulationApiCall = 3;

export type SimulationsApiResponse = SmModel.v2.skill.simulations.SimulationsApiResponse;
export type InvocationResponse = SmModel.v2.skill.InvocationResponse;
export type SmapiClient = services.skillManagement.SkillManagementServiceClient;

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export type OutputSpeech = Model.ui.OutputSpeech;
export type SessionMode = SmModel.v2.skill.simulations.SessionMode;
export type Reprompt = Model.ui.Reprompt;
export type Card = Model.ui.Card;
export type StandardOutput = {
    type?: 'Standard',
    outputSpeech: OutputSpeech,
    card?: Card,
    reprompt?: OutputSpeech,
    shouldEndSession?: boolean,
};
export type DirectiveOutput = {
    type: 'Directive',
    outputSpeech?: OutputSpeech,
    card?: Card,
    reprompt?: OutputSpeech,
    shouldEndSession?: boolean,
    directives?: Model.Directive[],
    directivePrompts?: string[]
};
export type Output = StandardOutput | DirectiveOutput;

export type TestTurnSkip = {
    skipValidation: true,
    preProcessor?: PreProcessor,
    input: {
        speak: string,
        mode?: SessionMode
    },
    output?: Output,
    postProcessor?: TurnPostProcessor
};

export type TestTurnNoSkip = {
    skipValidation?: false,
    preProcessor?: PreProcessor,
    input: {
        speak: string,
        mode?: SessionMode
    },
    output: Output
    postProcessor?: TurnPostProcessor
};

export type TestTurn = TestTurnNoSkip | TestTurnSkip;

export type TestCase = {
    title: string,
    turns: TestTurn[],
    preProcessor?: PreProcessor,
    postProcessor?: TestCasePostProcessor,
    before?: Mocha.Func,
    after?: Mocha.Func
}

export type TestData = {
    title: string,
    testCases: TestCase[],
    locale: string
}

export type PreProcessor = {
    (): Promise<void>
};

export type TurnPostProcessor = {
    (response: SimulationsApiResponse): Promise<void>
};

export type TestCasePostProcessor = {
    (): Promise<void>
};

export function print(message?: string) {
    if (message) {
        const messageArray = message.split('\n');

        for (const msg of messageArray) {
            console.log(`          ${msg}`);
        }
    }
}

function hasDirective(simulationResult: SimulationsApiResponse): boolean {
    const invocationResponse = getInvocationResponse(simulationResult);

    if (invocationResponse?.body?.response?.directives) {
        return true;
    }

    return false;
}

function getDirectiveType(simulationResult: SimulationsApiResponse): string | undefined {
    const invocationResponse = getInvocationResponse(simulationResult);

    return invocationResponse?.body?.response?.directives[0]?.type;
}

function getInvocationResponse(simulationResult: SimulationsApiResponse): InvocationResponse | undefined {
    const invocations = simulationResult?.result?.skillExecutionInfo?.invocations;
    if (invocations?.length === 1) {
        return invocations[0].invocationResponse;
    }
    else if (invocations) {
        for (const invocation of invocations) {
            const request = invocation.invocationRequest?.body?.request;
            const dialogState = request?.dialogState;

            if (dialogState === 'COMPLETED' || !dialogState) {
                return invocation.invocationResponse;
            }
        }
    }

    return undefined;
}

function getResponse(simulationResult: SimulationsApiResponse): Model.Response | undefined {
    const invocationResponse = getInvocationResponse(simulationResult);
    return invocationResponse?.body?.response;
}

function getCaption(simulationResult: SimulationsApiResponse): string | undefined {
    return simulationResult.result?.alexaExecutionInfo?.alexaResponses?.[0]?.content?.caption;
}

function getOutputSpeech(simulationResult: SimulationsApiResponse): Model.ui.OutputSpeech | undefined {
    const response = getResponse(simulationResult);
    return response?.outputSpeech;
}

function getCard(simulationResult: SimulationsApiResponse): Model.ui.Card | undefined {
    const response = getResponse(simulationResult);
    return response?.card;
}

function getReprompt(simulationResult: SimulationsApiResponse): OutputSpeech | undefined {
    const response = getResponse(simulationResult);
    return response?.reprompt?.outputSpeech;
}

export function getSessionAttributes(simulationResult: SimulationsApiResponse): { [key: string]: any } {
    const invocationResponse = getInvocationResponse(simulationResult);
    return invocationResponse?.body?.sessionAttributes;
}

function getShouldEndSession(simulationResult: SimulationsApiResponse): boolean | undefined {
    const response = getResponse(simulationResult);
    return response?.shouldEndSession;
}

function getDirectives(simulationResult: SimulationsApiResponse): Model.Directive[] | undefined {
    const response = getResponse(simulationResult);
    return response?.directives;
}

function isAskForPermissionCard(card: Model.ui.Card | undefined): card is Model.ui.AskForPermissionsConsentCard {
    return card?.type === 'AskForPermissionsConsent';
}

function isLinkAccountCard(card: Model.ui.Card | undefined): card is Model.ui.LinkAccountCard {
    return card?.type === 'LinkAccount';
}

function isSimpleCard(card: Model.ui.Card | undefined): card is Model.ui.SimpleCard {
    return card?.type === 'Simple';
}

function isStandardCard(card: Model.ui.Card | undefined): card is Model.ui.StandardCard {
    return card?.type === 'Standard';
}

function isSsmlOutputSpeech(outputSpeech: OutputSpeech | undefined): outputSpeech is Model.ui.SsmlOutputSpeech {
    return outputSpeech?.type === 'SSML';
}

function isPlainTextOutputSpeech(outputSpeech: OutputSpeech | undefined): outputSpeech is Model.ui.PlainTextOutputSpeech {
    return outputSpeech?.type === 'PlainText'
}

function isDirectiveOutput(output: Output): output is DirectiveOutput {
    return output.type === 'Directive';
}

function shouldSkipValidation(turn: TestTurn): boolean {
    return turn.skipValidation === true;
}


function validateCard(actual?: Model.ui.Card, toBe?: Card) {
    if (isAskForPermissionCard(actual) && isAskForPermissionCard(toBe)) {
        if (actual.permissions.length === toBe.permissions.length) {
            for (const permission of actual.permissions) {
                if (toBe.permissions.findIndex((element) => { return permission === element; }) >= 0) {
                    continue;
                }
                else {
                    assert.fail(`Unmatched Permission: expected ${permission} but not found in actual ${actual.permissions.toString()}`);
                }
            }
        }
        else {
            assert.fail(`Unmatched Permission: expected ${toBe.permissions.toString()} equal to ${actual.permissions.toString()}`);
        }
    }
    else {
        assert.deepEqual(actual, toBe, 'Unmatched Card');
    }
}

function convertToSsml(text?: string) {
    return `<speak>${text}</speak>`;
}

function convertToPlainText(text?: string) {
    return text?.replace('<speak>', '').replace('</speak>', '');
}

export function executeTest(
    testGroup: TestData,
    config: any,
    acceptUnexpectedDelegation?: boolean,
    dumpResponse?: boolean,
    skipUndefinedToBe?: boolean,
    skipUndefinedActual?: boolean) {

    const refreshTokenConfig: Smapi.RefreshTokenConfig = {
        clientId: config.client_id,
        clientSecret: config.client_secret,
        refreshToken: config.refresh_token
    };

    const smapiClient = new Smapi.StandardSmapiClientBuilder()
        .withRefreshTokenConfig(refreshTokenConfig)
        .client();
    const skillId = config.skill_id;

    if (acceptUnexpectedDelegation === undefined) {
        if (config.acceptUnexpectedDelegation !== undefined) {
            acceptUnexpectedDelegation = config.acceptUnexpectedDelegation;
        }
        else {
            acceptUnexpectedDelegation = false;
        }
    }

    if (dumpResponse === undefined) {
        if (config.dumpResponse !== undefined) {
            dumpResponse = config.dumpResponse;
        }
        else {
            dumpResponse = false;
        }
    }

    if (skipUndefinedToBe === undefined) {
        if (config.skipUndefinedToBe !== undefined) {
            skipUndefinedToBe = config.skipUndefinedToBe;
        }
        else {
            skipUndefinedToBe = false;
        }
    }

    if (skipUndefinedActual === undefined) {
        if (config.skipUndefinedActual !== undefined) {
            skipUndefinedActual = config.skipUndefinedActual;
        }
        else {
            skipUndefinedActual = false;
        }
    }

    const locale = testGroup.locale ? testGroup.locale : 'ja-JP';

    describe(testGroup.title, function () {
        const fileName = Path.basename(this.file || '', '.js');
        describe(`File: ${fileName}`, function () {
            for (const testCase of testGroup.testCases) {
                executeTestCase(testCase,
                    smapiClient,
                    skillId,
                    locale,
                    acceptUnexpectedDelegation === undefined ? false : acceptUnexpectedDelegation,
                    dumpResponse === undefined ? false : dumpResponse,
                    skipUndefinedToBe === undefined ? false : skipUndefinedToBe,
                    skipUndefinedActual === undefined ? false : skipUndefinedActual);
            }
        });
    });
}

async function executeTestCase(testCase: TestCase, smapiClient: SmapiClient, skillId: string, locale: string, acceptUnexpectedDelegation: boolean, dumpResponse: boolean, skipUndefinedToBe: boolean, skipUndefinedActual: boolean) {

    describe(`TC: ${testCase.title}`, function () {
        let failed = false;
        beforeEach(function () { failed && this.skip() })
        afterEach(function () { if (!failed) { failed = this.currentTest?.state === "failed" } });

        if (testCase.before) {
            before(testCase.before);
        }

        if (testCase.preProcessor) {
            describe('Pre-processing for Test Case', function () {
                it('Pre-rocessing for Test Case', async function () {
                    if (testCase.preProcessor) {
                        await testCase.preProcessor();
                    }
                });
            });
        }

        let turnNumber = 0;
        for (const turn of testCase.turns) {
            ++turnNumber;
            executeTestTurn(turn, turnNumber, smapiClient, skillId, locale, acceptUnexpectedDelegation, dumpResponse, skipUndefinedToBe, skipUndefinedActual);
        };

        if (testCase.postProcessor) {
            describe('Post-processing for Test Case', function () {
                it('Post-processing for Test Case', async function () {
                    if (testCase.postProcessor) {
                        await testCase.postProcessor();
                    }
                });
            });
        }

        if (testCase.after) {
            after(testCase.after);
        }
    });
}

async function executeTestTurn(turn: TestTurn, turnNumber: number, smapiClient: SmapiClient, skillId: string, locale: string, acceptUnexpectedDelegation: boolean, dumpResponse: boolean, skipUndefinedToBe: boolean, skipUndefinedActual: boolean) {
    describe(`Turn: ${turnNumber}`, function () {
        it(`Validating Turn ${turnNumber}`, async function () {
            if (turn.preProcessor) {
                await turn.preProcessor();
            }

            if (turn.output && isSsmlOutputSpeech(turn.output.outputSpeech)) {
                turn.output.outputSpeech.ssml = convertToSsml(turn.output.outputSpeech.ssml);
            }

            if (turn.output && isSsmlOutputSpeech(turn.output.reprompt)) {
                turn.output.reprompt.ssml = convertToSsml(turn.output.reprompt.ssml);
            }

            const simulationRequest: SmModel.v2.skill.simulations.SimulationsApiRequest = {
                session: {
                    mode: turn.input.mode ? turn.input.mode : 'DEFAULT'
                },
                input: {
                    content: turn.input.speak
                },
                device: {
                    locale: locale
                }
            };

            print(".............................");
            print(`... U: ${turn.input.speak}`);

            let apiResponse: SmModel.v2.skill.simulations.SimulationsApiResponse;
            let retry = 0;

            do {
                try {
                    apiResponse = await smapiClient.simulateSkillV2(skillId, 'development', simulationRequest);
                }
                catch (error) {
                    print(` Simulation API failed (NAME=${error.name}, RC=${error.statusCode}, MSG=${error.response?.message})\n`);
                    throw error;
                }

                const simulationId = apiResponse.id;

                if (simulationId) {
                    process.stdout.write('          ... ');
                    while (apiResponse.status === 'IN_PROGRESS') {
                        process.stdout.write('.');
                        await sleep(1000);
                        try {
                            apiResponse = await smapiClient.getSkillSimulationV2(skillId, 'development', simulationId);
                        }
                        catch (error) {
                            process.stdout.write('\n');
                            print(` Simulation API failed (NAME=${error.name}, RC=${error.statusCode}, MSG=${error.response?.message})\n`);
                            throw error;
                        }
                    }
                }
                else if (apiResponse.status === 'SUCCESSFUL') {
                    break;
                }
                else {
                    print(' no simulation Id');
                    assert.fail('No simulationId returned from Simulation.');
                }

                if (apiResponse.status === 'FAILED') {
                    process.stdout.write(` Simulation API failed (RC=${apiResponse.result?.error?.code}, MSG=${apiResponse.result?.error?.message}), retry ...\n`);
                    ++retry;
                }
            }
            while (apiResponse.status === 'FAILED' && retry < MaxRetryForSimulationApiCall)

            if (apiResponse.status !== 'SUCCESSFUL') {
                print(`........ Skill simulation response = ${apiResponse.status}`)
                assert(false, 'Skill simulation API failed');
            }

            process.stdout.write('\r');

            const caption = getCaption(apiResponse);
            print(`... A: ${caption}`);
            print(".............................");

            if (dumpResponse) {
                print(JSON.stringify(getResponse(apiResponse), null, 2));
            }

            if (turn.skipValidation) {
                print('#### Skipping validation ...');
                // Do nothing ...
            }
            else if (hasDirective(apiResponse) && !isDirectiveOutput(turn.output)) {
                if (getDirectiveType(apiResponse) === 'Dialog.Delegate') {
                    if (acceptUnexpectedDelegation) {
                        print(`#### UNEXPECTED DELEGATION (Accepted) ####`);
                        const toBeOutputSpeech = turn.output.outputSpeech;

                        if (isSsmlOutputSpeech(toBeOutputSpeech)) {
                            assert.equal(caption, convertToPlainText(toBeOutputSpeech.ssml), 'Unexpected Delegation & Unmatched Caption')
                        }
                        else {
                            assert.equal(caption, toBeOutputSpeech?.text, 'Unexpected Delegation & Unmatched Caption')
                        }
                    }
                    else {
                        print(`#### UNEXPECTED DELEGATION (Denied) ####`);
                        assert.fail(`Unexpected Dialog.Delegate directived`);
                    }
                }
                else {
                    print(`#### UNEXPECTED DIRECTIVE ${getDirectiveType(apiResponse)}`);
                    assert.fail(`Unexpected directive: ${getDirectiveType(apiResponse)}`);
                }
            }
            else {
                const actualOutputSpeech = getOutputSpeech(apiResponse);
                const toBeOutputSpeech = turn.output.outputSpeech;
                assert.deepEqual(actualOutputSpeech, toBeOutputSpeech, 'Unmatched OutputSpeech');

                const actualCard = getCard(apiResponse);
                const toBeCard = turn.output.card;
                if ((toBeCard || !skipUndefinedToBe) && (actualCard || !skipUndefinedActual)) {
                    validateCard(actualCard, toBeCard);
                }

                const actualReprompt = getReprompt(apiResponse);
                const toBeReprompt = turn.output.reprompt;
                if ((toBeReprompt || !skipUndefinedToBe) && (actualReprompt || !skipUndefinedActual)) {
                    assert.deepEqual(actualReprompt, toBeReprompt, 'Unmatched Reprompt');
                }

                const actualShouldEndSession = getShouldEndSession(apiResponse);
                const toBeShouldEndSession = turn.output.shouldEndSession;
                if ((toBeShouldEndSession || !skipUndefinedToBe) && (actualShouldEndSession || !skipUndefinedActual)) {
                    assert.equal(actualShouldEndSession, toBeShouldEndSession, 'Unmatched ShouldEndSession');
                }

                if (isDirectiveOutput(turn.output)) {
                    if (turn.output.directivePrompts) {
                        assert.include(turn.output.directivePrompts, caption, `No Caption Matched with Directive Prompts: ${caption}`);
                    }

                    const actualDirectives = getDirectives(apiResponse);
                    const toBeDirectives = turn.output.directives;

                    if ((toBeDirectives) && (actualDirectives || !skipUndefinedActual)) {
                        // If toBeDirectives is undefined, then its validation is skipped even if skipUndefinedToBe is false.
                        if (actualDirectives) {
                            for (const directive of toBeDirectives) {
                                assert.deepInclude(actualDirectives, directive, `A ToBE Directive Not Matched to Acutal`);
                            }
                            for (const directive of actualDirectives) {
                                assert.deepInclude(toBeDirectives, directive, `An Actual Directive Not Matched to ToBe`);
                            }
                        }
                        else {
                            assert.fail('No Directive in Response');
                        }
                    }
                }

                if (turn.postProcessor) {
                    await turn.postProcessor(apiResponse);
                }
            }
        });
    });
}