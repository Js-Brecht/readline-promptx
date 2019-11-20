import { IState } from '../model';
/** @hidden
 * @returns {IState} The empty state
 */
export const getEmptyState = (): IState => {
    return {
        actualRows: 0,
        virtualRows: -1,
        plain: [],
        render: [],
    };
};
