import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { v4 as uuidv4 } from "uuid";

const socket = io("http://localhost:4000");

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f0f2f5",
    minHeight: "100vh",
    textAlign: "center",
  },
  header: {
    marginBottom: 10,
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  onlineCount: {
    marginBottom: 20,
    color: "#555",
  },
  addButton: {
    padding: "8px 12px",
    borderRadius: 6,
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    marginBottom: 10,
  },
  columnsWrapper: {
    display: "flex",
    overflowX: "auto",
    gap: 12,
    paddingBottom: 20,
    maxWidth: "100%",
  },
  column: {
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    width: 270,
    padding: 12,
    flexShrink: 0,
  },
  columnHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: 10,
  },
  columnInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    border: "none",
    background: "transparent",
    outline: "none",
  },
  deleteButton: {
    background: "transparent",
    border: "none",
    fontSize: 18,
    cursor: "pointer",
    marginLeft: 8,
    color: "#dc3545",
  },
  task: {
    backgroundColor: "#fff",
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    border: "1px solid #ddd",
  },
  taskInput: {
    width: "100%",
    border: "none",
    background: "transparent",
    outline: "none",
    fontSize: 14,
  },
  addTaskButton: {
    marginTop: 8,
    padding: "6px 10px",
    borderRadius: 4,
    backgroundColor: "#28a745",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
  },
};

function App() {
  const [board, setBoard] = useState(null);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    socket.on("boardState", (newBoard) => setBoard(newBoard));
    socket.on("presence", (count) => setOnlineCount(count));
    return () => {
      socket.off("boardState");
      socket.off("presence");
    };
  }, []);

  if (!board) return <div style={styles.container}>Loading...</div>;

  const onDragEnd = (result) => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;

    if (type === "column") {
      const newColumnOrder = Array.from(board.columnOrder);
      newColumnOrder.splice(source.index, 1);
      newColumnOrder.splice(destination.index, 0, draggableId);
      const newBoard = { ...board, columnOrder: newColumnOrder };
      setBoard(newBoard);
      socket.emit("updateBoard", newBoard);
      return;
    }

    const start = board.columns[source.droppableId];
    const finish = board.columns[destination.droppableId];

    if (start === finish) {
      const newTaskIds = Array.from(start.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);
      const newColumn = { ...start, taskIds: newTaskIds };
      const newBoard = {
        ...board,
        columns: { ...board.columns, [newColumn.id]: newColumn },
      };
      setBoard(newBoard);
      socket.emit("updateBoard", newBoard);
      return;
    }

    const startTaskIds = Array.from(start.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStart = { ...start, taskIds: startTaskIds };

    const finishTaskIds = Array.from(finish.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    const newFinish = { ...finish, taskIds: finishTaskIds };

    const newBoard = {
      ...board,
      columns: {
        ...board.columns,
        [newStart.id]: newStart,
        [newFinish.id]: newFinish,
      },
    };
    setBoard(newBoard);
    socket.emit("updateBoard", newBoard);
  };

  const addColumn = () => {
    const newColId = uuidv4();
    const newColumn = { id: newColId, title: "New Column", taskIds: [] };
    const newBoard = {
      ...board,
      columns: { ...board.columns, [newColId]: newColumn },
      columnOrder: [...board.columnOrder, newColId],
    };
    setBoard(newBoard);
    socket.emit("updateBoard", newBoard);
  };

  const addTask = (colId) => {
    const newTaskId = uuidv4();
    const newTask = {
      id: newTaskId,
      title: "New Task",
      description: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const newTasks = { ...board.tasks, [newTaskId]: newTask };
    const newTaskIds = [...board.columns[colId].taskIds, newTaskId];
    const newColumn = { ...board.columns[colId], taskIds: newTaskIds };
    const newBoard = {
      ...board,
      tasks: newTasks,
      columns: { ...board.columns, [colId]: newColumn },
    };
    setBoard(newBoard);
    socket.emit("updateBoard", newBoard);
  };

  const deleteTask = (colId, taskId) => {
    const newTasks = { ...board.tasks };
    delete newTasks[taskId];

    const newTaskIds = board.columns[colId].taskIds.filter((id) => id !== taskId);
    const newColumn = { ...board.columns[colId], taskIds: newTaskIds };

    const newBoard = {
      ...board,
      tasks: newTasks,
      columns: { ...board.columns, [colId]: newColumn },
    };

    setBoard(newBoard);
    socket.emit("updateBoard", newBoard);
  };

  const updateTaskTitle = (taskId, title) => {
    const task = board.tasks[taskId];
    const updatedTask = { ...task, title, updatedAt: new Date().toISOString() };
    const newBoard = {
      ...board,
      tasks: { ...board.tasks, [taskId]: updatedTask },
    };
    setBoard(newBoard);
    socket.emit("updateBoard", newBoard);
  };

  const updateColumnTitle = (colId, title) => {
    const col = board.columns[colId];
    const updatedCol = { ...col, title };
    const newBoard = {
      ...board,
      columns: { ...board.columns, [colId]: updatedCol },
    };
    setBoard(newBoard);
    socket.emit("updateBoard", newBoard);
  };

  const deleteColumn = (colId) => {
    const column = board.columns[colId];
    const newTasks = { ...board.tasks };
    column.taskIds.forEach((taskId) => delete newTasks[taskId]);

    const newColumns = { ...board.columns };
    delete newColumns[colId];

    const newColumnOrder = board.columnOrder.filter((id) => id !== colId);

    const newBoard = {
      ...board,
      tasks: newTasks,
      columns: newColumns,
      columnOrder: newColumnOrder,
    };

    setBoard(newBoard);
    socket.emit("updateBoard", newBoard);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>🧩 Real-time Collaborative Task Board</div>
      <div style={styles.onlineCount}>👥 Online Users: {onlineCount}</div>
      <button onClick={addColumn} style={styles.addButton}>
        + Add Column
      </button>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="all-columns" direction="horizontal" type="column">
          {(provided) => (
            <div
              style={styles.columnsWrapper}
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {board.columnOrder.map((colId, index) => {
                const column = board.columns[colId];
                return (
                  <Draggable key={colId} draggableId={colId} index={index}>
                    {(provided) => (
                      <div
                        style={styles.column}
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                      >
                        <div {...provided.dragHandleProps} style={styles.columnHeader}>
                          <input
                            style={styles.columnInput}
                            type="text"
                            value={column.title}
                            onChange={(e) => updateColumnTitle(colId, e.target.value)}
                          />
                          <button
                            onClick={() => deleteColumn(colId)}
                            style={styles.deleteButton}
                          >
                            🗑️
                          </button>
                        </div>
                        <Droppable droppableId={colId} type="task">
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              style={{ minHeight: 100 }}
                            >
                              {column.taskIds.map((taskId, idx) => {
                                const task = board.tasks[taskId];
                                return (
                                  <Draggable key={taskId} draggableId={taskId} index={idx}>
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        style={{ ...styles.task, ...provided.draggableProps.style }}
                                      >
                                        <div style={{ display: "flex", alignItems: "center" }}>
                                          <input
                                            type="text"
                                            value={task.title}
                                            onChange={(e) =>
                                              updateTaskTitle(taskId, e.target.value)
                                            }
                                            style={{ ...styles.taskInput, flex: 1 }}
                                          />
                                          <button
                                            onClick={() => deleteTask(colId, taskId)}
                                            style={styles.deleteButton}
                                          >
                                            🗑️
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                );
                              })}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                        <button onClick={() => addTask(colId)} style={styles.addTaskButton}>
                          + Add Task
                        </button>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

export default App;
