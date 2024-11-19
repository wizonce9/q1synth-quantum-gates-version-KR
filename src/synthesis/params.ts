
import { Param } from './synthesisSlice'

export const granularParams: Param[] = [
    { type: '비율', id: 'rate', min: 0.25, max: 4, step: 0, values: [0, 1], selected: false }, // rate -> 速率
    { type: '크기', id: 'size', min: 0.05, max: 1, step: 0, values: [0, 1], selected: false }, // size -> 大小
    { type: '중복', id: 'overlap', min: 0.1, max: 1, step: 0, values: [0, 0.5], selected: false }, // overlap -> 重叠
    { type: '시작', id: 'begin', min: 0, max: 1, step: 0, values: [0, 0], selected: false }, // begin -> 开始
    { type: '끝', id: 'end', min: 0, max: 1, step: 0, values: [1, 1], selected: false }, // end -> 结束
]

export const fmParams: Param[] = [
    { type: '변조 지수', id: 'modi', min: 0, max: 20, step: 0, values: [0.5, 1], selected: false }, // modi -> 调制
    { type: '조화성 비율', id: 'harm', min: 0.25, max: 10, step: 0.25, values: [0.25, 1], selected: false }, // harm -> 和声
]

export const subtractiveParams: Param[] = [
    { type: '비율', id: 'rate', min: 0, max: 1, step: 0, values: [0, 1], selected: false }, // rate -> 速率
    { type: '깊이', id: 'depth', min: 0, max: 1, step: 0, values: [0, 1], selected: false }, // depth -> 深度
]

export const synthesisParams = {
    granular: granularParams,
    fm: fmParams,
    subtractive: subtractiveParams,
}

export const genericParams = [
    { type: '노트', id: 'n', min: 0, max: 7, step: 1, values: [0, 1], selected: false }, // note -> 音符
    { type: '게인', id: 'amp', min: 0, max: 1, step: 0, values: [0.75, 1], selected: false }, // gain -> 增益
    { type: '옥타브', id: 'oct', min: 3, max: 7, step: 1, values: [0.5, 0.5], selected: false }, // octave -> 八度
]

export const effectParams = [
    { type: '리버브', id: 'reverb', min: 0, max: 1, step: 0, values: [0, 0], selected: false }, // reverb -> 混响
    { type: '딜레이', id: 'delay', min: 0, max: 1, step: 0, values: [0, 0], selected: false }, // delay -> 延迟
    { type: '크러쉬', id: 'crush', min: 16, max: 4, step: 0, values: [0, 0], selected: false }, // crush -> 压碎
    { type: '팬', id: 'pan', min: -1, max: 1, step: 0, values: [0.5, 0.5], selected: false }, // pan -> 声像
    { type: '하이 컷', id: 'hicut', min: 100, max: 20000, step: 0, values: [1, 1], selected: false }, // hicut -> 高切
    { type: '로우 컷', id: 'locut', min: 0, max: 5000, step: 0, values: [0, 0], selected: false }, // locut -> 低切
]
