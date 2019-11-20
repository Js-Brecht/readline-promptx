/** @hidden */
export type IPlainState = [number, string];
/** @hidden */
export type IRenderState = string;
/** @hidden */
export interface IState {
    virtualRows: number;
    actualRows: number;
    plain: IPlainState[];
    render: IRenderState[];
}
/** @hidden */
export interface IInputPos {
    X: number;
    Y: number;
    offsetY: number;
    offsetX: number;
}
