package com.nexusflow.api.controller;

import com.nexusflow.api.repository.DocumentRepository;
import com.nexusflow.api.service.CurrentUserService;
import com.nexusflow.api.service.DocumentService;
import com.nexusflow.common.dto.DocumentDto;
import com.nexusflow.common.dto.PageDto;
import com.nexusflow.common.dto.UploadResponseDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents")
public class DocumentController {

    private static final int MAX_PAGE_SIZE = 100;

    private final DocumentService documents;
    private final CurrentUserService users;

    public DocumentController(DocumentService documents, CurrentUserService users) {
        this.documents = documents;
        this.users = users;
    }

    @GetMapping
    public PageDto<DocumentDto> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String direction,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "false") boolean archived) {

        var filter = new DocumentRepository.Filter(
                users.currentUserId(), q, type, status, archived,
                sort, direction, Math.max(0, page), Math.min(Math.max(1, size), MAX_PAGE_SIZE));

        return documents.list(filter);
    }

    @GetMapping("/{id}")
    public DocumentDto get(@PathVariable UUID id) {
        return documents.get(id);
    }

    @PostMapping("/upload")
    public ResponseEntity<UploadResponseDto> upload(@RequestParam("file") MultipartFile file) {
        UUID id = documents.upload(file, users.currentUserId());
        return ResponseEntity.accepted().body(new UploadResponseDto(
                id,
                "UPLOADING",
                "/topic/documents/" + id,
                "File received. Processing in background."));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void delete(@PathVariable UUID id) {
        documents.delete(id, users.currentUserId());
    }

    @PostMapping("/{id}/archive")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void archive(@PathVariable UUID id) {
        documents.setArchived(id, true);
    }

    @PostMapping("/{id}/restore")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void restore(@PathVariable UUID id) {
        documents.setArchived(id, false);
    }
}
