import { IState } from '../model';
export const getEmptyState = (): IState => {
    return {
        actualRows: 0,
        virtualRows: -1,
        plain: [],
        render: [],
    };
};
