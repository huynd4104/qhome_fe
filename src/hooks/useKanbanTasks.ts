export const useKanbanTasks = () => {
    return {
        tasksByStatus: {},
        columnsConfig: [],
        employees: [],
        isAdmin: false,
        userRole: '',
        filter: {},
        loading: false,
        error: null,
        updateTaskStatus: () => { },
        assignTask: () => { },
        updateFilter: () => { },
    };
};
