import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../app/store';
import { synthesisParams, genericParams, effectParams } from './params';
import { blendBetweenValues, mapToRange, roundToNearestX } from '../functions/utils';
import sound from './sound';
import { gain } from './global';
import { getGateHistory } from '../features/sidePanel/SidePanel';



// These should remain in sync
export type SynthType = 'fm' | 'granular' | 'subtractive'
export const synthTypes = ['fm', 'granular', 'subtractive']

export interface Param {
    type: string
    id: string
    min: number
    max: number
    step: number
    values: number[]
    selected: boolean
}

export interface Coordinates {
    x: number
    y: number
    z: number
}

export interface SynthesisState {
    synth: SynthType
    disabled: boolean
    qubit: Coordinates
    params: {[key: string]: Param[]}
    measureTime: number
    sample: number
    samples: string[]
}

const initialSynth = 'fm'

const initialState: SynthesisState = {
    synth: initialSynth,
    disabled: false,
    qubit: {
        x: 0,
        y: 0,
        z: 0
    },
    measureTime: 5,
    params: {
        xParams: genericParams,
        yParams: synthesisParams[initialSynth],
        zParams: effectParams,
        envParams: [
            { type: '어택', id: 'a', min: 0, max: 2, step: 0, values: [0.1], selected: false}, // attack -> 起音
            { type: '디케이', id: 'd', min: 0, max: 1, step: 0, values: [0.2], selected: false}, // decay -> 衰减
            { type: '서스테인', id: 's', min: 0, max: 1, step: 0, values: [0.5], selected: false}, // sustain -> 维持
            { type: '릴리즈', id: 'r', min: 0, max: 4, step: 0, values: [1], selected: false }  // release -> 释放
        ],
        modEnvParams: [
            { type: '어택', id: 'moda', min: 0, max: 2, step: 0, values: [0], selected: false}, // attack -> 起音
            { type: '디케이', id: 'modd', min: 0, max: 1, step: 0, values: [0.2], selected: false}, // decay -> 衰减
            { type: '서스테인', id: 'mods', min: 0, max: 1, step: 0, values: [0.5], selected: false}, // sustain -> 维持
            { type: '릴리즈', id: 'modr', min: 0, max: 4, step: 0, values: [1], selected: false } // release -> 释放
        ],
        globalParams: [
            { type: '음량', id: 'volume', min: 0, max: 4, step: 0, values: [0.5], selected: false} // volume -> 音量
        ]

    },
    sample: 0,
    samples: [
        'https://tonejs.github.io/audio/berklee/arpeggio3crazy.mp3',
        'https://tonejs.github.io/audio/berklee/taps_1c.mp3',
        'https://tonejs.github.io/audio/berklee/tinkle3.mp3',
        'https://tonejs.github.io/audio/berklee/tapping1.mp3',
        'https://tonejs.github.io/audio/berklee/gong_1.mp3',
        'https://tonejs.github.io/audio/berklee/gurgling_theremin_1.mp3'
    ]
};

export const synthesisSlice = createSlice({
    name: 'synthesis',
    initialState,
    reducers: {
        setSynth: (state, action: PayloadAction<SynthType>) => {
            state.synth = action.payload;
            state.params.xParams = genericParams;
            state.params.yParams = synthesisParams[action.payload];
            state.params.zParams = effectParams;
            sound.setType(action.payload);
        },
        setParam: (state, action: PayloadAction<{id: string, valuesI: number, value: number}>) => {
            const { id, valuesI, value } = action.payload;
            const params = [...Object.values(state.params).flat()];
            
            const param = params.find(p => p.id === id)
            param && (param.values[valuesI] = value);

            param?.id === 'volume' && gain.gain.rampTo(mapToRange(value, 0, 1, 0, 4), 0.1);

            sound.mutate(formatSynthParams(state.params, state.qubit));
        },
        toggleSelectedParam: (state, action: PayloadAction<string>) => {
            const id = action.payload
            const params = [...Object.values(state.params).flat()];
            const param = params.find(p => p.id === id)
            
            param && (param.selected = true);
        },
        moveSelectedParams: (state, action: PayloadAction<string>) => {
            const { xParams, yParams, zParams } = state.params;
            const selectedParams = [...xParams, ...yParams, ...zParams].filter(p => p.selected);
            state.params = {
                ...state.params,
                xParams: xParams.filter(p => !p.selected),
                yParams: yParams.filter(p => !p.selected),
                zParams: zParams.filter(p => !p.selected)
            }
            state.params[action.payload] = [
                ...state.params[action.payload], 
                ...selectedParams.map(p => ({...p, selected: false}))
            ];
        },
        setQubit: (state, action: PayloadAction<Coordinates>) => {
            state.qubit = action.payload;
            sound.mutate(formatSynthParams(state.params, state.qubit));
        },
        setQubitAxis: (state, action: PayloadAction<{axis: any, value: number}>) => {
            if(state.disabled) return;
            const { axis, value } = action.payload;
            axis === 'x' && (state.qubit.x = value);
            axis === 'y' && (state.qubit.y = value);
            axis === 'z' && (state.qubit.z = value);
            sound.mutate(formatSynthParams(state.params, state.qubit));
        },
        incrementQubitBy: (state, action: PayloadAction<Coordinates>) => {
            const { x, y, z } = action.payload;
            state.qubit.x += x
            state.qubit.y += y
            state.qubit.z += z
        },
        play: (state) => {
            // 获取当前的量子门历史
            const history = getGateHistory();

            // 先复制原有的 qubit 对象以避免修改原始数据
            const updatedQubit = { ...state.qubit };

            // 遍历 history，根据不同的门类型更新 updatedQubit
            history.forEach(item => {
                switch (item.gate) {
                    case 'X':
                        updatedQubit.x = 1 - updatedQubit.x;
                        break;
                    case 'Y':
                        updatedQubit.x = 1 - updatedQubit.x;
                        updatedQubit.y = (1 + updatedQubit.y)%2;
                        break;
                    case 'Z':
                        updatedQubit.y = (1 + updatedQubit.y)%2;
                        break;
                    case 'Rx':
                        if (item.value !== undefined) {
                            updatedQubit.x = (updatedQubit.x + item.value)%1;
                        }
                        break;
                    case 'Ry':
                        if (item.value !== undefined) {
                            updatedQubit.x = (updatedQubit.x + item.value)%1;
                            updatedQubit.y = (updatedQubit.y + item.value)%2;
                        }
                        break;
                    case 'Rz':
                        if (item.value !== undefined) {
                            updatedQubit.y = (updatedQubit.y + item.value)%2;
                        }
                        break;
                    case 'H':
                        updatedQubit.x = 0.5;
                        updatedQubit.y = (1 + updatedQubit.y)%2;
                        break;
                    case 'T':
                        updatedQubit.y = (0.25 + updatedQubit.y)%2;
                        break;
                    case 'S':
                        updatedQubit.y = (0.5 + updatedQubit.y)%2;
                        break;
                    default:
                        console.warn(`Unknown gate: ${item.gate}`);
                }
        });

        // 使用修改后的 qubit 值来播放声音
        sound.on(formatSynthParams(state.params, updatedQubit));

        // 输出更新后的 qubit 对象，查看调试信息
        console.log('Updated Qubit:', updatedQubit);
        },
        stop: () => sound.off(),
        randomise: (state) => {
            const { xParams, yParams, zParams } = state.params;
            [...xParams, ...yParams, ...zParams].forEach((param: Param) => {
                if(['하이 컷', '로우 컷', '게인'].includes(param.type)) return;

                param.values = param.values.map(() => Math.random())
            })

            sound.mutate(formatSynthParams(state.params, state.qubit));
        },
        collapseSynth: (state, action: PayloadAction<Coordinates>) => {
            sound.collapse(
                formatSynthParams(state.params, state.qubit),
                formatSynthParams(state.params, action.payload),
                state.measureTime
            )
        },
        loadState: (state, action: PayloadAction<SynthesisState>) => {
            const { synth, params, sample, samples, measureTime } = action.payload;
            
            state.synth = synth;
            sound.setType(synth);
            
            state.params = {
                ...state.params,
                ...params,
                globalParams: [
                    ...state.params.globalParams,
                ]
            }
            state.measureTime = measureTime || 5;
            
            state.sample = sample;
            samples[sample] && sound.setBuffer(samples[sample]);
            
            sound.mutate(formatSynthParams(state.params, state.qubit));
        },
        setDisabled: (state, action: PayloadAction<boolean>) => {
            state.disabled = action.payload;
        },
        setSample: (state, action: PayloadAction<number>) => {
            state.sample = action.payload;
        },
        updateSamples: (state, action: PayloadAction<string[]>) => {
            state.samples = [...state.samples, ...action.payload];
        },
        setMeasureTime: (state, action: PayloadAction<number>) => {
            state.measureTime = action.payload;
        }
    }
});

export const getSynth = (state: RootState) => state.synthesis.synth;
export const getSample = (state: RootState) => state.synthesis.sample;
export const getSamples = (state: RootState) => state.synthesis.samples;
export const getXParams = (state: RootState) => state.synthesis.params.xParams;
export const getYParams = (state: RootState) => state.synthesis.params.yParams;
export const getZParams = (state: RootState) => state.synthesis.params.zParams;
export const getGlobalParams = (state: RootState) => state.synthesis.params.globalParams;
export const getEnvParams = (state: RootState) => state.synthesis.params.envParams;
export const getModEnvParams = (state: RootState) => state.synthesis.params.modEnvParams;
export const getQubit = (state: RootState) => state.synthesis.qubit;
export const getDisabled = (state: RootState) => state.synthesis.disabled;
export const getMeasureTime = (state: RootState) => state.synthesis.measureTime;
export const getState = (state: RootState) : SynthesisState => {
    return {...state.synthesis}
}

export const { 
    setSynth,
    setParam,
    setQubit,
    setQubitAxis,
    incrementQubitBy,
    play,
    stop,
    collapseSynth,
    randomise,
    loadState,
    setDisabled,
    toggleSelectedParam,
    moveSelectedParams,
    setSample,
    updateSamples,
    setMeasureTime
} = synthesisSlice.actions;



/**
 * Any final scaling of the param value should be done here
**/
function sanitiseParam(key: string, value: number) {
    switch(key) {
        case '노트':
            // TODO: add in more scales?
            return [0,2,3,5,7,9,10,12][Math.floor(value)] + 36
        default:
            return value;
    }
}

/**
 * Calculate a synth param based on the qubit position
**/
function calculateParamValue(param: Param, angle: number) {
    const { values } = param;
    const interpolated = blendBetweenValues(angle, values, [0, 180])
    const scaled = mapToRange(interpolated, 0, 1, param.min, param.max);
    const rounded = param.step ? roundToNearestX(scaled, param.step) : Math.round(scaled * 100) / 100;
    const sanitised = sanitiseParam(param.type, rounded);
    return {id: param.id, value: sanitised}
}

/**
 * Format synth params into the shape required by CtSynths package
**/
function formatSynthParams(params: {[key: string]: Param[]}, qubit: Coordinates) {
    // TODO: these should be calculated via matrices
    const x = mapToRange(qubit.x, -1, 1, 0, 360);
    const y = mapToRange(qubit.y, -1, 1, 0, 360);
    const z = mapToRange(qubit.z, -1, 1, 0, 360);
    const flattened = [
        ...params.xParams.map(p => calculateParamValue(p, x)),
        ...params.yParams.map(p => calculateParamValue(p, y)),
        ...params.zParams.map(p => calculateParamValue(p, z)),
        ...params.envParams.map(p => ({id: p.id, value: p.values[0]})),
        ...params.modEnvParams.map(p => ({id: p.id, value: p.values[0]})),
    ];

    return Object.values(flattened).reduce((obj, {id, value}) => {
        return { 
            ...obj, 
            [id]: value
        }; 
    }, {})
}

export default synthesisSlice.reducer;