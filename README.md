## CRUD+L operations on AWS Amplify GraphQL API + DynamoDB

Here I build a notes app(to-do) that will allow user create, update, and delete notes
Also have GraphQL subscriptions in order to see updates in real time.

In another repo I build an AWS _API Gateway_, only one function to show the Amplify feature
to create RESTful API, in that case using Typescrit.
Here we'll pull **GraphQL** as alternative to REST.

### Note

You will need an AWS acc. and also need some keys to configure the project, watch this [video](https://youtu.be/fWbM5DLh25U)  
to learn how to configure the Amplify CLI

## Credits

This example and code is based on book **Full Stack Serverless** by [Nader Dabit](https://twitter.com/dabit3)  
I changed the project a bit using `Typescript` insted of `JavaScript` code examples, and used  
_node-fetch_ instead of _Axios_.  
AWS Amplify will generete the `src/aws-exports.js` file that you will need to configure the React client App

## GraphQL Server

We'll implement **AWS AppSync** a service that allow us to deploy a full **GraphQL API**, **resolvers**, and **data-sources** very
quickly using the Amplify CLI.

We must only to create a very basic _GraphQL_ schema (few lines) and the tool will provide resolvers and other GraphQL operatios
to perform full CRUD operation

## To Create the GraphQL API

At root you can create the Amplify project

```bash
  amplify init
```

Then follow the steps CLI prompts  
With the Amplify project initialized, we can then add GraphQL API:

```bash
  amplify add api
```

On the first option `Please select from on of the below mentioned services:` choose **GraphQL**

Open the base GraphQL schema (generated) at: `<projectName>/amplify/backend/api/<apiName>/schema.graphql`
Update the schema like this:

```graphql
type Note @model {
  id: ID!
  clientId: ID
  name: String!
  description: String
  completed: Boolean
}
```

From this, Amplify will generate additional schema definitions for _Queries_ and _Mutations_(Create,Read,Update,Delete + List)
Also schema for GraphQL subscriptions (real time updates)
create a **DynamoDB** database
Resolvers code for all **GraphQL** operations

Finally, deploy API:

```bash
  amplify push
```

- On option `Choose the code generation language target: Typescript` instead of _Javascript_

Once deplyment completed, The API and database have been successfully create and ready to Rock 🤘

You can interact with your GraphQL API opening the AWS Console _GraphQL playground_

```bash
  amplify console api
```

## About the code

The logic for _list_, _create_, _update_, _delete_ and _subscription_ is in one file:  
`src/App.tsx`  
The _useReducer_ React Hook was used to manage state, this is a function that receives
as parameter a function that will update state based on actions dispatched

### reducer function

```ts
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
```

### update function

```ts
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
```

## Take a look

![GraphQL CRUD AWS Amplify](https://icons-images.s3.us-east-2.amazonaws.com/screencasts/CRUD_Amplify_Peek+2021-03-08+13-42.gif)
