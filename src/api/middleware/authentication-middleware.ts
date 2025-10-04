import UnauthorizedError from "../../domain/errors/unauthorized-error";
import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";

const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  const authData= getAuth(req);
  if (!authData.isAuthenticated) {
    throw new UnauthorizedError("Unauthorized");
  }
  next();
};

export default isAuthenticated;