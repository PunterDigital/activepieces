import { GetParams, PieceMetadataService } from './piece-metadata-service'
import { AllPiecesStats } from './piece-stats-service'
import { CloudPieceMetadataService } from './cloud-piece-metadata-service'
import { DbPieceMetadataService } from './db-piece-metadata-service'
import { ActivepiecesError, EXACT_VERSION_PATTERN, ErrorCode } from '@activepieces/shared'
import { PieceMetadataModel, PieceMetadataModelSummary } from '../piece-metadata-entity'

const cloudPieceProvider = CloudPieceMetadataService()
const dbPieceProvider = DbPieceMetadataService()

export const AggregatedPieceMetadataService = (): PieceMetadataService => {
    return {
        async list({ release, projectId, edition }): Promise<PieceMetadataModelSummary[]> {
            const cloudMetadata = await cloudPieceProvider.list({
                release,
                projectId,
                edition,
            })
            const dbMetadata = await dbPieceProvider.list({
                release,
                projectId,
                edition,
            })
            return [...cloudMetadata, ...dbMetadata]
        },

        async get({ name, version, projectId }: GetParams): Promise<PieceMetadataModel> {
            try {
                const dbMetadata = await dbPieceProvider.get({
                    name, version, projectId,
                })
                return dbMetadata
            }
            catch (e) {
                if (e instanceof ActivepiecesError && (e as ActivepiecesError).error.code === ErrorCode.ENTITY_NOT_FOUND) {
                    const cloudMetadata = await cloudPieceProvider.get({
                        name, version, projectId,
                    })
                    return cloudMetadata
                }
                throw e
            }
        },

        async create(params): Promise<PieceMetadataModel> {
            return dbPieceProvider.create(params)
        },

        async delete(params): Promise<void> {
            return dbPieceProvider.delete(params)
        },

        async stats(): Promise<AllPiecesStats> {
            throw new Error('operation not supported')
        },

        async getExactPieceVersion({ name, version, projectId }): Promise<string> {
            const isExactVersion = EXACT_VERSION_PATTERN.test(version)

            if (isExactVersion) {
                return version
            }

            const pieceMetadata = await this.get({
                projectId,
                name,
                version,
            })

            return pieceMetadata.version
        },
    }
}
