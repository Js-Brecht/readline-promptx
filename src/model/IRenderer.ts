export type IPlainState = [number, string];
export type IRenderState = string;
export interface IState {
    virtualRows: number;
    actualRows: number;
    plain: IPlainState[];
    render: IRenderState[];
}
export interface IInputPos {
    X: number;
    Y: number;
    offsetY: number;
    offsetX: number;
}
export interface IStdio {
    stdin: NodeJS.ReadStream;
    stdout: NodeJS.WriteStream;
}
