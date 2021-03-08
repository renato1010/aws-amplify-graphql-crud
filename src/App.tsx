import { useReducer, useEffect, useCallback, ChangeEvent } from "react";
import { API } from "aws-amplify";
import { GraphQLResult } from "@aws-amplify/api-graphql";
import { v4 as uuid } from "uuid";
import { Note, ListNotesQuery } from "./API";
import { List, Input, Button } from "antd";
import "antd/dist/antd.css";
import { listNotes } from "./graphql/queries";
import { createNote as CreateNote } from "./graphql/mutations";

const CLIENT_ID = uuid();

type ClientNote = Pick<
  Note,
  "id" | "clientId" | "completed" | "description" | "name"
>;
type NotesState = {
  notes: ClientNote[];
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
  | { type: "LOADING"; payload: boolean }
  | { type: "ADD_NOTE"; payload: ClientNote }
  | { type: "RESET_FORM" }
  | { type: "SET_INPUT"; payload: { name: string; value: string } };

const reducerFn = (state: NotesState, action: NotesActions): NotesState => {
  switch (action.type) {
    case "SET_NOTES":
      return { ...state, notes: action.payload };
    case "ERROR":
      return { ...state, error: action.payload };
    case "ADD_NOTE":
      return { ...state, notes: [...state.notes, action.payload] };
    case "RESET_FORM":
      return { ...state, form: initialState.form };
    case "SET_INPUT":
      return {
        ...state,
        form: { ...state.form, [action.payload.name]: action.payload.value },
      };
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
      dispatch({ type: "LOADING", payload: false });
    } catch (error) {
      console.error("error: ", error);
      dispatch({ type: "ERROR", payload: true });
    }
  };
  const createNote = async () => {
    const {
      form: { name, description },
    } = state;
    if (!name || !description) {
      return alert("please enter a name and description");
    }
    const note: ClientNote = {
      name,
      description,
      clientId: CLIENT_ID,
      completed: false,
      id: uuid(),
    };
    dispatch({ type: "ADD_NOTE", payload: note });
    dispatch({ type: "RESET_FORM" });
    try {
      await API.graphql({ query: CreateNote, variables: { input: note } });
      console.log("successfully created note!");
    } catch (error) {
      console.log("CreateNote Error: ", error);
    }
  };
  const onChange = (evt: ChangeEvent<HTMLInputElement>) => {
    dispatch({
      type: "SET_INPUT",
      payload: { name: evt.target.name, value: evt.target.value },
    });
  };
  // effects
  useEffect(() => {
    fetchNotes();
  }, []);
  const renderItem = useCallback((item: ClientNote) => {
    return (
      <List.Item style={{ textAlign: "left" }}>
        <List.Item.Meta title={item.name} description={item.description} />
      </List.Item>
    );
  }, []);
  return (
    <div style={styles.container}>
      <Input
        onChange={onChange}
        name="name"
        value={state.form.name}
        placeholder="Note Name"
        style={styles.input}
      />
      <Input
        onChange={onChange}
        name="description"
        value={state.form.description}
        placeholder="Note description"
        style={styles.input}
      />
      <Button onClick={createNote} type="primary">
        Create Note
      </Button>
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
