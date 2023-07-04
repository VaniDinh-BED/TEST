import Error from "../helper/error.js";

export const createBlogValidate = (data, data2) => {
    const error = new Error()
    error.isRequired(data.title ,'title')
    error.isRequired(data.description, 'description')
    error.isRequired(data.content, 'content')
    error.isRequired(data2.picture, 'picture')
    return error.get()
}