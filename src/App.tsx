import { useReducer, useEffect, ChangeEvent } from "react";
import { API, graphqlOperation } from "aws-amplify";
import { GraphQLResult } from "@aws-amplify/api-graphql";
import { v4 as uuid } from "uuid";
import Observable from "zen-observable-ts/lib";
import { ListNotesQuery, Note } from "./API";
import { List, Input, Button } from "antd";
import "antd/dist/antd.css";
import { listNotes } from "./graphql/queries";
import {
  createNote as CreateNote,
  deleteNote as DeleteNote,
  updateNote as UpdateNote,
} from "./graphql/mutations";
import { onCreateNote } from "./graphql/subscriptions";

const CLIENT_ID = uuid();

type SubsOnCreateNote = Omit<Note, "__typename">;
type SubsOnCreateValue = {
  value: { data: { onCreateNote: SubsOnCreateNote } };
};
type NotesState = {
  notes: Omit<SubsOnCreateNote, "updatedAt" | "createdAt">[];
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
  | {
      type: "ADD_NOTE";
      payload: Omit<SubsOnCreateNote, "updatedAt" | "createdAt">;
    }
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
      dispatch({
        type: "SET_NOTES",
        payload: items as Omit<SubsOnCreateNote, "updatedAt" | "createdAt">[],
      });
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
    const note: Omit<SubsOnCreateNote, "updatedAt" | "createdAt"> = {
      name,
      description,
      clientId: CLIENT_ID,
      completed: false,
      id: uuid(),
    };
    // dispatch({ type: "ADD_NOTE", payload: note });
    dispatch({ type: "RESET_FORM" });
    try {
      await API.graphql({ query: CreateNote, variables: { input: note } });
      console.log("successfully created note!");
    } catch (error) {
      console.log("CreateNote Error: ", error);
    }
  };
  const deleteNote = async (id: string) => {
    const remainNotes = state.notes.filter((note) => note.id !== id);
    dispatch({ type: "SET_NOTES", payload: remainNotes });
    try {
      await API.graphql({ query: DeleteNote, variables: { input: { id } } });
      console.log("successfully deleted Note(id): ", id);
    } catch (error) {
      console.log({ "Error deleting Note: ": error });
    }
  };
  const updateNote = async (
    targetNote: Omit<SubsOnCreateNote, "updatedAt" | "createdAt">
  ) => {
    const selectedNoteIndex = state.notes.findIndex(
      (note) => note.id === targetNote.id
    );
    if (selectedNoteIndex === -1) return;
    const updatedNotes = [...state.notes];
    updatedNotes[selectedNoteIndex].completed = !targetNote.completed;
    dispatch({ type: "SET_NOTES", payload: updatedNotes });
    try {
      await API.graphql({
        query: UpdateNote,
        variables: {
          input: {
            id: targetNote.id,
            completed: updatedNotes[selectedNoteIndex].completed,
          },
        },
      });
      console.log(`Note(${targetNote.id}): Updated successfully`);
    } catch (error) {
      console.log(`Error updating Note(${targetNote.id})`);
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
    const $createSub = API.graphql(graphqlOperation(onCreateNote));
    function isObservable(
      sub: Promise<GraphQLResult<object>> | Observable<object>
    ): sub is Observable<object> {
      return (
        (sub as Observable<object>).subscribe((val) => console.log) !==
        undefined
      );
    }
    if (isObservable($createSub)) {
      const subscription = $createSub.subscribe({
        next: (noteData: SubsOnCreateValue) => {
          console.log({ noteData });
          const createdNote = noteData.value.data.onCreateNote;
          // if (CLIENT_ID === createdNote.clientId) return;
          dispatch({ type: "ADD_NOTE", payload: createdNote });
        },
        error: (errorValue) => {
          console.log("subscription error: ", errorValue);
        },
      });
      return () => {
        console.log("cleanup");
        //@eslint-ignore
        subscription.unsubscribe();
      };
    }
  }, []);
  const renderItem = (
    item: Omit<SubsOnCreateNote, "updatedAt" | "createdAt">
  ) => {
    return (
      <List.Item
        style={{ textAlign: "left" }}
        actions={[
          <p style={styles.p} onClick={() => deleteNote(item.id as string)}>
            Delete
          </p>,
          <p style={styles.p} onClick={() => updateNote(item)}>
            {item.completed ? "completed" : "Mark as completed"}
          </p>,
        ]}
      >
        <List.Item.Meta title={item.name} description={item.description} />
      </List.Item>
    );
  };
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
  p: { color: "#1890ff", cursor: "pointer" },
};

export default App;
