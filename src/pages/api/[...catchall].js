import app from '../../server/app';

export const config = {
    api: {
        externalResolver: true,
        bodyParser: false,
    },
};

export default function handler(req, res) {
    return app(req, res);
}
