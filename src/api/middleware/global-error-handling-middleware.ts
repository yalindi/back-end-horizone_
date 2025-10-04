import e from "express";
import NotFoundError from "../../domain/errors/not-found-error";
import UnauthorizedError from "../../domain/errors/unauthorized-error";
import ValidationError from "../../domain/errors/validation-error";
import ForbiddenError from "../../domain/errors/forbidden-error";
import { Request, Response, NextFunction } from "express";


const globalErrorHandlingMiddleware = (error:Error, req:Request, res:Response, next:NextFunction) => {
  console.error(error);

  if (error instanceof NotFoundError){
    res.status(404).json({message: error.message});
  }
  else if (error instanceof ValidationError){
    res.status(400).json({message: error.message});
  }
  else if (error instanceof UnauthorizedError){
    res.status(401).json({message: error.message});
  }
  else if (error instanceof ForbiddenError){
    res.status(403).json({message: error.message});
  }
  else {
    res.status(500).json({message: "Internal Server Error"});
  }


}

export default globalErrorHandlingMiddleware;