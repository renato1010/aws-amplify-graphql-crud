import { useReducer, useEffect, useCallback } from "react";
import { API } from "aws-amplify";
import { GraphQLResult } from "@aws-amplify/api-graphql";
import { Note, ListNotesQuery } from "./API";
import { List } from "antd";
import "antd/dist/antd.css";
import { listNotes } from "./graphql/queries";

type NotesState = {
  notes: Note[] | undefined;
  loading: boolean;
  error: boolean;
  form: { name: string; description: string };
};
const initialState: NotesState = {
  notes: [],
  loading: false,
  error: false,
  form: { name: "", description: "" },
};
type NotesActions =
  | { type: "SET_NOTES"; payload: NotesState["notes"] }
  | { type: "ERROR"; payload: boolean }
  | { type: "LOADING"; payload: boolean };

const reducerFn = (state: NotesState, action: NotesActions): NotesState => {
  switch (action.type) {
    case "SET_NOTES":
      return { ...state, notes: action.payload };
    case "ERROR":
      return { ...state, error: action.payload };
    default:
      return state;
  }
};
function App() {
  const [state, dispatch] = useReducer(reducerFn, initialState);
  const fetchNotes = async () => {
    dispatch({ type: "LOADING", payload: true });
    try {
      const notesData = await (API.graphql({
        query: listNotes,
      }) as Promise<GraphQLResult<ListNotesQuery>>);
      const items = notesData?.data?.listNotes?.items ?? [];
      console.log(items);
      dispatch({ type: "SET_NOTES", payload: items as Note[] });
    } catch (error) {
      console.error("error: ", error);
      dispatch({ type: "ERROR", payload: true });
    }
  };
  // effects
  useEffect(() => {
    fetchNotes();
  }, []);
  const renderItem = useCallback((item: Note) => {
    return (
      <List.Item style={{ textAlign: "left" }}>
        <List.Item.Meta title={item.name} description={item.description} />
      </List.Item>
    );
  }, []);
  return (
    <div style={styles.container}>
      <List
        loading={state.loading}
        dataSource={state.notes}
        renderItem={renderItem}
      />
    </div>
  );
}
const styles = {
  container: { padding: 20 },
  input: { marginBottom: 10 },
  item: { textAlign: "left" },
  p: { color: "#1890ff" },
};

export default App;
