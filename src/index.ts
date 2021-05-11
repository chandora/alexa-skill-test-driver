/**
 * Copyright (c) 2021, KAWAMURA Tateo (chandora@pvision.jp)
 */
import * as Model from 'ask-sdk-model';
import * as SmModel from 'ask-smapi-model';

export type SimulationsApiResponse = SmModel.v2.skill.simulations.SimulationsApiResponse;
export type InvocationResponse = SmModel.v2.skill.InvocationResponse;

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export class TurnInput {
    content: string;
    mode: SmModel.v2.skill.simulations.SessionMode = 'DEFAULT';
    constructor(content: string, mode?: SmModel.v2.skill.simulations.SessionMode) {
        this.content = content;

        if (mode) {
            this.mode = mode;
        }
    }
};

export type TurnOutputParams = {
    outputSpeech: Model.ui.OutputSpeech,
    card?: Model.ui.Card,
    reprompt?: Model.ui.OutputSpeech,
    shouldEndSession?: boolean,
    startWith?: boolean,
    endWith?: boolean
};

export class TurnOutput {
    outputSpeech: Model.ui.OutputSpeech | undefined;
    card: Model.ui.Card | undefined;
    reprompt: Model.ui.OutputSpeech | undefined;
    shouldEndSession: boolean = true;
    startWith: boolean = false;
    endWith: boolean = false;

    constructor(params: TurnOutputParams) {
        this.outputSpeech = params.outputSpeech;
        this.card = params.card;
        this.reprompt = params.reprompt;

        if (params.shouldEndSession !== undefined) {
            this.shouldEndSession = params.shouldEndSession;
        }

        if (params.startWith !== undefined) {
            this.startWith = params.startWith;
        }

        if (params.endWith !== undefined) {
            this.endWith = params.endWith;
        }
    }

    validateCard(actual?: Model.ui.Card): boolean {
        const toBe = this.card;

        if (actual && toBe) {
            if (actual.type === toBe.type) {
                if (isAskForPermissionCard(actual) && isAskForPermissionCard(toBe)) {
                    if (actual.permissions.length === toBe.permissions.length) {
                        for (const permission of actual.permissions) {
                            if (toBe.permissions.findIndex((element) => { return permission === element; }) >= 0) {
                                continue;
                            }
                            else {
                                return false;
                            }
                        }

                        return true;
                    }
                    else {
                        return false;
                    }
                }
                else if (isLinkAccountCard(actual) && isLinkAccountCard(toBe)) {
                    return true;
                }
                else if (isSimpleCard(actual) && isSimpleCard(toBe)) {
                    if (this.compareCardText(actual.title, toBe.title)) {
                        return true;
                    }
                    else {
                        console.log(`........ Simple Card: title = ${actual.title} vs ${toBe.title}, content = ${actual.content} vs ${toBe.content}`);
                    }
                }
                else if (isStandardCard(actual) && isStandardCard(toBe)) {
                    if (this.compareCardText(actual.title, toBe.title)
                        && actual.image?.largeImageUrl === toBe.image?.largeImageUrl
                        && actual.image?.smallImageUrl === toBe.image?.smallImageUrl) {
                        return true;
                    }
                    else {
                        console.log(`........ Standard Card: ${JSON.stringify(actual)} vs ${JSON.stringify(toBe)}`);
                    }
                }
                else {
                    console.log('........ Internal error');
                }
            }
            else {
                console.log(`........ Type: ${actual.type} vs ${toBe.type}`);
            }
        }
        else if (!actual && !toBe) {
            return true;
        }
        else {
            console.log(`........ Undefined: ${actual} vs ${toBe}`);
        }

        return false;
    }

    protected compareCardText(actual?: string, toBe?: string) {
        if (actual && toBe) {
            if (actual === toBe) {
                return true;
            }
            else if (this.startWith && actual.startsWith(toBe)) {
                return true;
            }
            else if (this.endWith && actual.endsWith(toBe)) {
                return true;
            }
            else {
                console.log(`........ Card Text: ${actual} vs ${toBe}`);
                return false;
            }
        }
        else if (!actual && !toBe) {
            return true;
        }

        console.log(`........ Undefined: ${actual} vs ${toBe}`);

        return false;
    }

    validateOutputSpeech(actual?: Model.ui.OutputSpeech): boolean {
        return this.validateSpeech(actual, this.outputSpeech);
    }

    validateReprompt(actual?: Model.ui.OutputSpeech): boolean {
        return this.validateSpeech(actual, this.reprompt);
    }

    protected validateSpeech(actual?: Model.ui.OutputSpeech, toBe?: Model.ui.OutputSpeech) {
        if (actual && toBe) {
            if (actual.type === toBe.type) {
                if (isSsmlOutputSpeech(actual) && isSsmlOutputSpeech(toBe)) {
                    const actualText = actual.ssml.replace('<speak>', '').replace('</speak>', '');

                    if (actualText === toBe.ssml) {
                        return true;
                    }
                    else if (this.startWith && actualText.startsWith(toBe.ssml)) {
                        return true;
                    }
                    else if (this.endWith && actualText.endsWith(toBe.ssml)) {
                        return true;
                    }
                    else {
                        console.log(`........ Ssml Text: ${actualText} vs ${toBe.ssml}`);
                    }
                }
                else if (!isSsmlOutputSpeech(actual) && !isSsmlOutputSpeech(toBe)) {
                    if (actual.text === toBe.text) {
                        return true;
                    }
                    else if (this.startWith && actual.text.startsWith(toBe.text)) {
                        return true;
                    }
                    else if (this.endWith && actual.text.endsWith(toBe.text)) {
                        return true;
                    }
                    else {
                        console.log(`........ Plain Text: ${actual.text} vs ${toBe.text}`);
                    }
                }
            }
            else {
                console.log(`........ Type: ${actual.type} vs ${toBe.type}`);
            }
        }
        else if (!actual && !toBe) {
            return true;
        }
        else {
            console.log(`........ Undefined: ${JSON.stringify(actual)} vs ${JSON.stringify(toBe)}`);
        }

        return false;
    }

    validateShouldEndSession(actual?: boolean): boolean {
        const toBe = this.shouldEndSession;

        if (actual === toBe) {
            return true;
        }

        console.log(`........ Should End Session: ${actual} vs ${toBe}`);

        return false;
    }
};

export type PreProcessor = {
    (): Promise<boolean>
};

export type PostProcessor = {
    (response: SimulationsApiResponse): Promise<boolean>
};

export type TestTurnParams = { input: TurnInput, output: TurnOutput, preProcessor?: PreProcessor, postProcessor?: PostProcessor };

export class TestTurn {
    input: TurnInput;
    output: TurnOutput;
    preProcessor?: PreProcessor;
    postProcessor?: PostProcessor;

    constructor(param: TestTurnParams) {
        this.input = param.input;
        this.output = param.output;
        this.preProcessor = param.preProcessor;
        this.postProcessor = param.postProcessor;
    }
};

export class TestCase {
    locale = "ja-JP";
    turns: TestTurn[] = [];
    smapiClient: SmModel.services.skillManagement.SkillManagementServiceClient;
    skillId: string;
    title: string;
    breakOnTurnError: boolean = true;

    constructor(title: string, skillId: string, smapiClient: SmModel.services.skillManagement.SkillManagementServiceClient, locale?: "ja-JP") {
        this.title = title;
        this.smapiClient = smapiClient;
        this.skillId = skillId;

        if (locale) {
            this.locale = locale;
        }
    }

    addTestTurn(testTurn: TestTurn) {
        this.turns.push(testTurn);
    }

    async execute() {
        try {
            console.log("========================");
            console.log(`TC: ${this.title}`);;
            console.log("------------------------");

            let numOfTurn = 1;
            let totalValidation = true;

            for (const turn of this.turns) {
                console.log(`Turn = ${numOfTurn++}`);

                let validation = true;

                if (turn.preProcessor) {
                    console.log('... executing pre-processor');
                    validation &&= await turn.preProcessor();
                    console.log(`... result = ${validation}`);

                    if (!validation && this.breakOnTurnError) {
                        console.log(`........ breaking with error in pre-processor`);
                        break;
                    }
                }

                const simulationRequest: SmModel.v2.skill.simulations.SimulationsApiRequest = {
                    session: {
                        mode: turn.input.mode
                    },
                    input: {
                        content: turn.input.content
                    },
                    device: {
                        locale: this.locale
                    }
                };

                let response = await this.smapiClient.simulateSkillV2(this.skillId, 'development', simulationRequest);
                const simulationId = response.id;

                // console.log(response);

                if (simulationId) {
                    process.stdout.write('Getting result from Alexa ');
                    while (response.status === 'IN_PROGRESS') {
                        process.stdout.write('.');
                        await sleep(1000);
                        response = await this.smapiClient.getSkillSimulationV2(this.skillId, 'development', simulationId);
                    }
                    console.log(' completed');
                }

                console.log("------------------------");
                console.log(`U: ${turn.input.content}`);
                console.log(`A: ${getCaption(response)}`);
                console.log("------------------------");
                console.log('... validating outputSpeech');
                validation = turn.output.validateOutputSpeech(getOutputSpeech(response));
                console.log(`... result = ${validation}`);
                let turnValidation = validation;


                console.log('... validating card');
                validation = turn.output.validateCard(getCard(response));
                console.log(`... result = ${validation}`);
                turnValidation &&= validation;

                console.log('... validating reprompt');
                validation = turn.output.validateReprompt(getReprompt(response)?.outputSpeech);
                console.log(`... result = ${validation}`);
                turnValidation &&= validation;

                console.log('... validating shouldEndSession');
                validation = turn.output.validateShouldEndSession(getShouldEndSession(response));
                console.log(`... result = ${validation}`);
                turnValidation &&= validation;

                if (turn.postProcessor) {
                    console.log('... executing post-processor');
                    validation = await turn.postProcessor(response);
                    console.log(`... result = ${validation}`);
                    turnValidation &&= validation;
                }

                totalValidation &&= turnValidation;

                if (!turnValidation) {
                    console.log(JSON.stringify(response, null, 2));

                    if (this.breakOnTurnError) {
                        console.log("------------------------");
                        break;
                    }
                }

                console.log("------------------------");
            }

            if (totalValidation) {
                console.log(`TC: ${this.title} ==> Passed`);;
            }
            else {
                console.log(`${this.title} ==> Failed`);
            }
        }
        catch (error) {
            console.log(error);
            throw error;
        }
    }
};

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

export function getResponse(simulationResult: SimulationsApiResponse): Model.Response | undefined {
    const invocationResponse = getInvocationResponse(simulationResult);
    return invocationResponse?.body?.response;
}

export function getCaption(simulationResult: SimulationsApiResponse): string | undefined {
    return simulationResult.result?.alexaExecutionInfo?.alexaResponses?.[0].content?.caption;
}

export function getText(outputSpeech: Model.ui.OutputSpeech | undefined): string {
    let text: string = '';

    if (outputSpeech) {
        if (isSsmlOutputSpeech(outputSpeech)) {
            text = outputSpeech.ssml;
        }
        else {
            text = outputSpeech.text;
        }
    }

    return text;
}

export function getOutputSpeech(simulationResult: SimulationsApiResponse): Model.ui.OutputSpeech | undefined {
    const response = getResponse(simulationResult);
    return response?.outputSpeech;
}

export function getCard(simulationResult: SimulationsApiResponse): Model.ui.Card | undefined {
    const response = getResponse(simulationResult);
    return response?.card;
}

export function getReprompt(simulationResult: SimulationsApiResponse): Model.ui.Reprompt | undefined {
    const response = getResponse(simulationResult);
    return response?.reprompt;
}

export function getSessionAttributes(simulationResult: SimulationsApiResponse): { [key: string]: any } {
    const invocationResponse = getInvocationResponse(simulationResult);
    return invocationResponse?.body?.sessionAttributes;
}

export function getShouldEndSession(simulationResult: SimulationsApiResponse): boolean {
    const response = getResponse(simulationResult);
    return response?.shouldEndSession === true;
}

export function isAskForPermissionCard(card: Model.ui.Card | undefined): card is Model.ui.AskForPermissionsConsentCard {
    return card?.type === 'AskForPermissionsConsent';
}

export function isLinkAccountCard(card: Model.ui.Card | undefined): card is Model.ui.LinkAccountCard {
    return card?.type === 'LinkAccount';
}

export function isSimpleCard(card: Model.ui.Card | undefined): card is Model.ui.SimpleCard {
    return card?.type === 'Simple';
}

export function isStandardCard(card: Model.ui.Card | undefined): card is Model.ui.StandardCard {
    return card?.type === 'Standard';
}

export function isSsmlOutputSpeech(outputSpeech: Model.ui.OutputSpeech): outputSpeech is Model.ui.SsmlOutputSpeech {
    return outputSpeech?.type === 'SSML';
}

export function isPlainTextOutputSpeech(outputSpeech: Model.ui.OutputSpeech): outputSpeech is Model.ui.PlainTextOutputSpeech {
    return outputSpeech?.type === 'PlainText'
}