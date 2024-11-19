import React, { MouseEvent, useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { SliderGroup } from '../sliderGroup/SliderGroup';
import { Select } from '../select/Select';
import { Input } from '../input/Input';
import { Button } from '../buttons/Button';
import { Presets } from '../presets/Presets';
import { getMode, getShouldRecord, setShouldRecord } from '../../data/dataSlice';
import { SynthType, synthTypes, setSynth, getDisabled, setSample, getSample, getSamples, getMeasureTime, setMeasureTime, getGlobalParams } from '../../synthesis/synthesisSlice';
import { getMidiInputs, setActiveInput, getActiveMidiInput } from '../../midi/midiSlice';
import { getUseQasm, getBackend, setBackend } from '../../qasm/qasmSlice';
import { getSynth, getEnvParams, getModEnvParams, setParam } from '../../synthesis/synthesisSlice';
import sound from '../../synthesis/sound';
import styles from './SidePanel.module.css';

interface GateHistoryItem {
    gate: string;
    value?: number; // For gates like rx, ry, rz
}

// Gate history is defined at the module level so it can be accessed outside the component
let gateHistory: GateHistoryItem[] = [];

export function SidePanel() {
    const dispatch = useAppDispatch();
    const measureTime = useAppSelector(getMeasureTime);
    const mode = useAppSelector(getMode);
    const disabled = useAppSelector(getDisabled);
    const midiInputs = useAppSelector(getMidiInputs);
    const activeMidiInput = useAppSelector(getActiveMidiInput);
    const useQasm = useAppSelector(getUseQasm);
    const qasmBackend = useAppSelector(getBackend);
    const [active, setActive] = useState(0);
    const [show, setShow] = useState(false);
    const shouldRecord = useAppSelector(getShouldRecord);
    const envParams = useAppSelector(getEnvParams);
    const modEnvParams = useAppSelector(getModEnvParams);
    const globalParams = useAppSelector(getGlobalParams);
    const synth = useAppSelector(getSynth);
    const sample = useAppSelector(getSample);
    const samples = useAppSelector(getSamples);
    const [selectedGates, setSelectedGates] = useState<Array<{ gate: string, value: number }>>([]);

    useEffect(() => {
        const handleKeyDownRun = (e: KeyboardEvent) => {
            if (e.code !== 'Escape') return;
            e.preventDefault();
            setShow(false);
        };
        const handleResize = () => setShow(false);

        window.addEventListener('keydown', handleKeyDownRun);
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('keydown', handleKeyDownRun);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    function handleTimeOnClick(e: MouseEvent<HTMLButtonElement>, time: string) {
        dispatch(setMeasureTime(+time));
    }

    function handleHideShow(tab: number) {
        (show && tab !== active) || setShow(!show);
        setActive(tab);
    }

    function handleMidiSelect(e: React.ChangeEvent<HTMLSelectElement>) {
        dispatch(setActiveInput(e.target.value));
    }

    function handleBackendInput(e: React.ChangeEvent<HTMLInputElement>) {
        dispatch(setBackend(e.target.value));
    }

    function handleChangeSynth(e: React.ChangeEvent<HTMLSelectElement>) {
        const type = e.target.value as SynthType;
        dispatch(setSynth(type));
    }

    function handleParamChange(id: string, valuesI: number, value: number) {
        dispatch(setParam({ id, valuesI, value }));
    }

    function handleChangeSample(e: React.ChangeEvent<HTMLSelectElement>) {
        const sampleI = +e.target.value;
        const url = samples[sampleI];

        dispatch(setSample(sampleI));
        sound.setBuffer(url);
    }

    // Quantum Gates
    const quantumGates = [
        'X', 'Y', 'Z',
        'Rx', 'Ry', 'Rz',
        'H', 'T', 'S'
    ];

    // Add the selected gate to both selectedGates and gateHistory
    function handleGateClick(gate: string) {
        const gateItem = { gate, value: 0.5 }; // Initialize value for rx, ry, rz gates

        // Update selectedGates
        setSelectedGates(prev => {
            const updatedGates = [...prev, gateItem];
            // Sync gateHistory to only include current selected gates
            gateHistory = updatedGates.map(gate => ({
                gate: gate.gate,
                value: gate.value
            }));
            return updatedGates;
        });
    }

    // Remove gate from both selectedGates and gateHistory
    function handleDeleteGate(index: number) {
        setSelectedGates(prev => {
            const updatedGates = prev.filter((_, i) => i !== index);
            // Sync gateHistory to match selectedGates
            gateHistory = updatedGates.map(gate => ({
                gate: gate.gate,
                value: gate.value
            }));
            return updatedGates;
        });
    }

    // Update gate value in both selectedGates and gateHistory
    function handleSliderChange(index: number, value: number) {
        setSelectedGates(prev => {
            const updatedGates = [...prev];
            updatedGates[index].value = value;

            // Sync gateHistory with updated gate values
            gateHistory = updatedGates.map(gate => ({
                gate: gate.gate,
                value: gate.value
            }));

            return updatedGates;
        });
    }

    return (
        <aside className={`${styles.sidePanel} ${show ? styles.sidePanelOpen : styles.sidePanelClosed}`}>
            <div className={`${styles.sidePanel__content} ${active === 0 && styles.contentActive}`}>
                <span
                    className={`${styles.toggle} ${styles.toggle0} ${active === 0 && styles.toggleActive}`}
                    onClick={() => handleHideShow(0)}
                >소개</span>
                <div>
                    <h2>Q1 양자 신스</h2>
                    <p>양자 소리 디자인은 단일 양자비트를 회전하고 측정함으로써 달성된다.</p>
                    <p>경사각(θ)에 대한 마우스 Y.</p>
                    <p>방위각(φ)에 대한 마우스 X.</p>
                    <p>구면 위상(λ)에 대한 Shift + 마우스 X.</p>
                    <p>F 키가 전체 화면 양식으로 들어간다.</p>
                    <p>Shift를 누르면서 프리셋 키(1-10)를 클릭하면 현재 변조 상태가 저장된다.</p>
                </div>
            </div>
            {mode === 'advanced' &&
                <>
                    <div className={`${styles.sidePanel__content} ${active === 1 && styles.contentActive}`}>
                        <span
                            id="config"
                            className={`${styles.toggle} ${styles.toggle1} ${active === 1 && styles.toggleActive}`}
                            onClick={() => handleHideShow(1)}
                        >설정</span>
                        <Select
                            title="합성방법"
                            options={synthTypes.map((type) => ({ id: type, label: type }))}
                            onChange={handleChangeSynth}
                            value={synth}
                        />

                        <SliderGroup group="envParams" label="포락선" params={envParams} onChange={handleParamChange} />

                        {
                            synth !== 'granular' &&
                            <SliderGroup
                                group="modEnvParams"
                                label={`${synth === 'fm' ? '변조' : '포락선'}포락선`}
                                params={modEnvParams}
                                onChange={handleParamChange}
                            />
                        }

                        <SliderGroup group="globalParams" label="글로벌" params={globalParams} onChange={handleParamChange} />

                        {
                            synth === 'granular' &&
                            <Select
                                title="샘플"
                                options={
                                    samples.map((name: string, i: number) => ({
                                        id: i.toString(),
                                        label: name.substring(name.lastIndexOf('/') + 1)
                                    }))
                                }
                                onChange={handleChangeSample}
                                value={sample.toString()}
                            />
                        }

                        <Presets />
                        <div className={styles.measureContainer}>
                            <h2>측정주기</h2>
                            <label className={styles.checkboxLabel}>
                                기록?
                                <input
                                    className={styles.checkbox}
                                    type="checkbox"
                                    checked={shouldRecord}
                                    onChange={() => dispatch(setShouldRecord(!shouldRecord))}
                                />
                            </label>
                        </div>
                        <div className={styles.buttons}>
                            {[1, 5, 10].map((seconds, i) => (
                                <Button
                                    key={i}
                                    name={seconds.toString()}
                                    isActive={seconds === measureTime}
                                    disabled={disabled}
                                    onClick={handleTimeOnClick}
                                />
                            ))}
                        </div>

                        <Select
                            title="MIDI"
                            options={midiInputs.map(({ id, name }) => ({ id, label: name }))}
                            value={activeMidiInput}
                            onChange={handleMidiSelect}
                        />
                        {useQasm && <Input
                            title="Qasm Backend"
                            value={qasmBackend}
                            onChange={handleBackendInput}
                        />}
                    </div>

                    {/* New Quantum Gate Tab */}
                    <div className={`${styles.sidePanel__content} ${active === 2 && styles.contentActive}`}>
                        <span
                            id="quantumGate"
                            className={`${styles.toggle} ${styles.toggle2} ${active === 2 && styles.toggleActive}`}
                            onClick={() => handleHideShow(2)}
                        >양자 게이트</span>

                        <h2>구성 요소</h2>
                        <div className={styles.gatesGrid}>
                            {quantumGates.map(gate => (
                                <Button
                                    key={gate}
                                    name={gate}
                                    onClick={() => handleGateClick(gate)}
                                    isActive={false}
                                />
                            ))}
                        </div>

                        {/* Selected Gates Section */}
                        <h2>회로 시퀀스</h2>
                        <div className={styles.selectedGatesContainer}>
                            <div className={styles.scrollableContainer}>
                                {selectedGates.map((selectedGate, index) => (
                                    <div key={index} className={styles.selectedGateBox}>
                                        <span>{selectedGate.gate}</span>
                                        {['Rx', 'Ry', 'Rz'].includes(selectedGate.gate) && (
                                            <div className={styles.sliderContainer}>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="1"
                                                    step="0.01"
                                                    value={selectedGate.value}
                                                    onChange={(e) => handleSliderChange(index, +e.target.value)}
                                                />
                                                <span>{selectedGate.value.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <button className={styles.deleteButton} onClick={() => handleDeleteGate(index)}>삭제</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            }
        </aside>
    );
}

// Exporting the function to get the gate history
export function getGateHistory() {
    return gateHistory;
}
